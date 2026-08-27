"use client";

import { useMemo, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { getAuth } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase/client";
import { supabase } from "@/lib/supabase/client";
import {
  GUIDE_MEDIA_BUCKET,
  GUIDE_MEDIA_MAX_BYTES,
  ownedObjectPath,
  publicStorageUrl,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminMediaUpload({
  name,
  label,
  defaultUrl,
  markdownHelper = false,
}: {
  name?: string;
  label: string;
  defaultUrl?: string | null;
  markdownHelper?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [alt, setAlt] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const markdown = useMemo(
    () => (url ? `![${alt.trim() || "Describe this image"}](${url})` : ""),
    [alt, url],
  );

  async function upload(file: File) {
    setStatus("working");
    setMessage(null);
    try {
      const user = getAuth(firebaseApp).currentUser;
      if (!user) throw new Error("Sign in again to upload.");

      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1800,
        // browser-image-compression treats this as a target, not a hard
        // cap — keep real margin below the bucket's 1MB limit so a stubborn
        // image doesn't overshoot it.
        maxSizeMB: 0.6,
        useWebWorker: true,
        fileType: "image/webp",
      });
      if (compressed.size > GUIDE_MEDIA_MAX_BYTES) {
        throw new Error(
          "This image is still too large after compression. Try a smaller or simpler screenshot.",
        );
      }
      const path = ownedObjectPath(
        user.uid,
        `${Date.now()}-${file.name.replace(/\.[^.]+$/, "")}.webp`,
      );
      const { error } = await supabase.storage
        .from(GUIDE_MEDIA_BUCKET)
        .upload(path, compressed, {
          contentType: "image/webp",
          upsert: false,
        });
      if (error) throw error;

      setUrl(publicStorageUrl(GUIDE_MEDIA_BUCKET, path));
      setStatus("idle");
      setMessage(
        markdownHelper
          ? "Uploaded. Add alt text, then copy the Markdown."
          : "Uploaded. Save the post to keep this URL.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  async function copyMarkdown() {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setMessage("Markdown copied.");
    } catch {
      setMessage("Copy failed. Select the Markdown and copy it manually.");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <Label htmlFor={`${name ?? "inline-media"}-url`}>{label}</Label>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="max-h-52 w-full rounded-md border border-border object-contain"
        />
      )}
      <Input
        id={`${name ?? "inline-media"}-url`}
        name={name}
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://..."
        autoComplete="off"
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={status === "working"}
        onClick={() => fileRef.current?.click()}
      >
        {status === "working" ? "Uploading..." : "Upload image"}
      </Button>

      {markdownHelper && (
        <div className="mt-2 flex flex-col gap-2">
          <Label htmlFor="inline-media-alt">Image description</Label>
          <Input
            id="inline-media-alt"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            placeholder="What the screenshot shows"
          />
          <Label htmlFor="inline-media-markdown">Markdown</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="inline-media-markdown"
              value={markdown}
              readOnly
              className="font-mono"
            />
            <Button type="button" variant="outline" onClick={copyMarkdown}>
              Copy Markdown
            </Button>
          </div>
        </div>
      )}

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
    </div>
  );
}
