"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { optional, optionalInt, parseList } from "@/lib/admin/form-values";
import type { AdminFormState } from "@/components/admin/admin-form";
import { getProfileById } from "@/lib/db/profiles";
import {
  countActiveCredentials,
  createPortfolioItem,
  deletePortfolioItem,
  getPortfolioItem,
  isUsernameTaken,
  updateOwnProfile,
  updatePortfolioItem,
  type PortfolioInput,
  type ProfileInput,
} from "@/lib/db/talent";
import { AVATAR_BUCKET, publicStorageUrl } from "@/lib/storage";

const USERNAME = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Usernames are at least 3 characters.")
  .max(30)
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/,
    "Lowercase letters, numbers, and hyphens only — and it can't start or end with a hyphen.",
  );

const profileSchema = z.object({
  full_name: z.string().trim().max(120).nullable(),
  username: USERNAME.nullable(),
  headline: z.string().trim().max(140).nullable(),
  bio: z.string().trim().max(2000).nullable(),
  location: z.string().trim().min(2).max(80),
  situation: z
    .enum(["student", "employed", "jobseeker", "freelancer"])
    .nullable(),
  is_public: z.boolean(),
});

export async function saveProfileAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in again to save your profile." };

  const parsed = profileSchema.safeParse({
    full_name: optional(formData.get("full_name")),
    username: optional(formData.get("username")),
    headline: optional(formData.get("headline")),
    bio: optional(formData.get("bio")),
    location: optional(formData.get("location")) ?? "Philippines",
    situation: optional(formData.get("situation")),
    is_public: formData.get("is_public") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const { username, is_public } = parsed.data;

  // A public profile needs an address to live at and something to back it up.
  // Refusing here beats silently saving a profile that never appears.
  if (is_public && !username) {
    return { error: "Choose a username before making your profile public." };
  }

  // Three independent lookups, each a round trip to another region. They run
  // together; the checks below still report in a fixed order, so the message
  // someone sees does not depend on which query answered first.
  const [credentialCount, usernameTaken, existing] = await Promise.all([
    is_public ? countActiveCredentials(user.uid) : Promise.resolve(1),
    username
      ? isUsernameTaken(username, user.uid)
      : Promise.resolve(false),
    getProfileById(user.uid).catch(() => null),
  ]);

  if (is_public && credentialCount === 0) {
    return {
      error:
        "Public profiles list verified talent, so they open once you hold an active credential. Your profile is saved as private until then.",
    };
  }
  if (usernameTaken) {
    return { error: `“${username}” is taken. Try another.` };
  }

  const avatarPath = optional(formData.get("avatar_path"));

  const input: ProfileInput = {
    ...parsed.data,
    skills: parseList(formData.get("skills")).slice(0, 20),
    avatar_url: avatarPath
      ? publicStorageUrl(AVATAR_BUCKET, avatarPath)
      : (existing?.avatar_url ?? null),
  };

  try {
    await updateOwnProfile(user.uid, input);
  } catch (e) {
    console.error("save profile failed", e);
    const message = e instanceof Error ? e.message : "";
    if (message.includes("duplicate key") || message.includes("username")) {
      return { error: "That username is taken. Try another." };
    }
    return { error: "Couldn't save your profile. Try again." };
  }

  revalidatePath("/dashboard/profile");
  if (username) revalidatePath(`/talent/${username}`);
  revalidatePath("/employers");

  // The banner above the form already shows the public URL; repeating it
  // here just puts the same sentence on screen twice.
  return {
    ok: is_public
      ? "Saved. Your public profile is up to date."
      : "Saved. Your profile is private — only you can see it.",
  };
}

// ── Portfolio ───────────────────────────────────────────────────────────────

const portfolioSchema = z.object({
  itemId: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable(),
  project_url: z.string().trim().url().max(500).nullable(),
  sort_order: z.number().int().min(0).max(999),
});

export async function savePortfolioItemAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in again to save your work." };

  const parsed = portfolioSchema.safeParse({
    itemId: optional(formData.get("itemId")) ?? undefined,
    title: formData.get("title"),
    description: optional(formData.get("description")),
    project_url: optional(formData.get("project_url")),
    sort_order: optionalInt(formData.get("sort_order")) ?? 0,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue.path.join(".") || "form"}: ${issue.message}` };
  }

  const { itemId, ...rest } = parsed.data;
  const uploadedPath = optional(formData.get("image_path"));

  try {
    // Keep the existing image when the form was saved without picking a new one.
    let imagePath = uploadedPath;
    if (itemId && !uploadedPath) {
      const existing = await getPortfolioItem(itemId);
      if (!existing || existing.user_id !== user.uid) {
        return { error: "That item isn't yours." };
      }
      imagePath = existing.image_path;
    }

    const input: PortfolioInput = { ...rest, image_path: imagePath };

    if (itemId) {
      await updatePortfolioItem(itemId, user.uid, input);
    } else {
      await createPortfolioItem(user.uid, input);
    }
  } catch (e) {
    console.error("save portfolio item failed", e);
    return { error: "Couldn't save that piece of work." };
  }

  revalidatePath("/dashboard/profile");
  const profile = await getProfileById(user.uid).catch(() => null);
  if (profile?.username) revalidatePath(`/talent/${profile.username}`);

  return { ok: itemId ? "Saved." : "Added to your portfolio." };
}

export async function deletePortfolioItemAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in again." };

  const itemId = z.string().uuid().safeParse(formData.get("itemId"));
  if (!itemId.success) return { error: "Invalid request." };

  try {
    await deletePortfolioItem(itemId.data, user.uid);
  } catch (e) {
    console.error("delete portfolio item failed", e);
    return { error: "Couldn't remove that item." };
  }

  revalidatePath("/dashboard/profile");
  const profile = await getProfileById(user.uid).catch(() => null);
  if (profile?.username) revalidatePath(`/talent/${profile.username}`);

  return { ok: "Removed." };
}
