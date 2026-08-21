"use client";

import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { getAuth } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase/client";
import { supabase } from "@/lib/supabase/client";
import { ownedObjectPath, publicStorageUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * Compresses in the browser, converts to WebP, and uploads straight to
 * Supabase Storage under the uploader's own folder (§9). Compressing before
 * the upload rather than after matters here: this is a mobile-first product
 * in a country where mobile data is metered, and a 4 MB phone photo becomes
 * roughly a tenth of that before it leaves the device.
 *
 * The write is authorised by the storage policies, which only accept objects
 * whose first path segment is the caller's Firebase UID — so a tampered path
 * is refused by the database, not just by this component.
 */
export function ImageUpload({
  bucket,
  name,
  label,
  hint,
  maxWidthOrHeight,
  defaultUrl,
}: {
  bucket: string;
  name: string;
  label: string;
  hint?: string;
  maxWidthOrHeight: number;
  defaultUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(defaultUrl ?? null);
  const [path, setPath] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onPick(file: File) {
    setStatus("working");
    setMessage(null);
    try {
      const user = getAuth(firebaseApp).currentUser;
      if (!user) throw new Error("Sign in again to upload.");

      const compressed = await imageCompression(file, {
        maxWidthOrHeight,
        maxSizeMB: 0.4,
        useWebWorker: true,
        fileType: "image/webp",
      });

      const objectPath = ownedObjectPath(
        user.uid,
        `${Date.now()}-${file.name.replace(/\.[^.]+$/, "")}.webp`,
      );

      const { error } = await supabase.storage
        .from(bucket)
        .upload(objectPath, compressed, {
          contentType: "image/webp",
          upsert: true,
        });
      if (error) throw error;

      setPath(objectPath);
      setUrl(publicStorageUrl(bucket, objectPath));
      setStatus("idle");
      setMessage("Uploaded. Save the form to keep it.");
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof Error ? e.message : "Upload failed. Try a smaller image.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${name}-file`}>{label}</Label>

      {/* What the form actually submits: the stored path, or the existing one. */}
      <input type="hidden" name={name} value={path} />

      <div className="flex items-center gap-3">
        {url && (
          // Not next/image: the host is user content on Supabase Storage and
          // the optimiser would need it allowlisted per project.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="size-16 rounded-md border border-border object-cover"
          />
        )}
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            id={`${name}-file`}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onPick(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={status === "working"}
            onClick={() => inputRef.current?.click()}
          >
            {status === "working"
              ? "Uploading…"
              : url
                ? "Replace image"
                : "Choose image"}
          </Button>
        </div>
      </div>

      {message && (
        <p
          className={
            status === "error"
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
          role={status === "error" ? "alert" : undefined}
        >
          {message}
        </p>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
