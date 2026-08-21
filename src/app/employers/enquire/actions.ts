"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { optional } from "@/lib/admin/form-values";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, hashIp, RATE_LIMITS } from "@/lib/rate-limit";

export type EnquiryState = { error: string } | { ok: string } | null;

const schema = z.object({
  employer_name: z.string().trim().min(2, "Tell us your name.").max(120),
  employer_email: z.string().trim().email("Enter a working email address."),
  company: z.string().trim().max(120).nullable(),
  message: z
    .string()
    .trim()
    .min(20, "A sentence or two about the role helps us point you at the right people.")
    .max(4000),
  talent: z.string().trim().max(30).nullable(),
});

export async function submitEnquiryAction(
  _prev: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const headerList = await headers();
  const request = new Request("https://gnacademy.internal/enquire", {
    headers: headerList,
  });

  if (!(await checkRateLimit(request, RATE_LIMITS.enquiry))) {
    return {
      error: "Too many enquiries from this connection. Try again in an hour.",
    };
  }

  const parsed = schema.safeParse({
    employer_name: formData.get("employer_name"),
    employer_email: formData.get("employer_email"),
    company: optional(formData.get("company")),
    message: formData.get("message"),
    talent: optional(formData.get("talent")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const admin = supabaseAdmin();

  // Resolve the username to an id so the enquiry survives a later rename,
  // and only when that profile is actually public — an enquiry form must not
  // become a way to probe whether a given username exists.
  let talentUserId: string | null = null;
  if (parsed.data.talent) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .ilike("username", parsed.data.talent)
      .eq("is_public", true)
      .maybeSingle();
    talentUserId = data?.id ?? null;
  }

  try {
    const { error } = await admin.from("employer_enquiries").insert({
      employer_name: parsed.data.employer_name,
      employer_email: parsed.data.employer_email.toLowerCase(),
      company: parsed.data.company,
      message: parsed.data.message,
      talent_user_id: talentUserId,
      ip_hash: hashIp(
        headerList.get("x-forwarded-for")?.split(",")[0].trim() ??
          headerList.get("x-real-ip") ??
          "unknown",
      ),
    });
    if (error) throw error;
  } catch (e) {
    console.error("enquiry failed", e);
    return {
      error:
        "Couldn't send that. Email gnclub.contactus@gmail.com instead and we'll pick it up.",
    };
  }

  return {
    ok: "Enquiry received. We reply to serious enquiries within two working days.",
  };
}
