"use client";

import { useEffect, useId, useState } from "react";
import { BadgeCheck, Check, Copy, ExternalLink, Plus } from "lucide-react";
import {
  LINKEDIN_POST_MAX_LENGTH,
  SHARE_TEMPLATES,
  buildAddToProfileUrl,
  buildLinkedInPostUrl,
  buildPostText,
  type ShareCredential,
  type ShareTemplateId,
} from "@/lib/linkedin/share";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

type CopyState = "idle" | "copied" | "failed";

/** The LinkedIn mark. lucide-react dropped its brand icons, so it is inlined. */
function LinkedInMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn("size-4", className)}
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

/**
 * Clipboard write with a fallback. The async Clipboard API needs a secure
 * context and a permission the browser is free to refuse, and a share button
 * that silently does nothing is worse than one that says it could not copy.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fall through to the legacy path below.
  }
  try {
    const scratch = document.createElement("textarea");
    scratch.value = text;
    scratch.setAttribute("readonly", "");
    scratch.style.position = "fixed";
    scratch.style.opacity = "0";
    document.body.appendChild(scratch);
    scratch.select();
    const ok = document.execCommand("copy");
    scratch.remove();
    return ok;
  } catch {
    return false;
  }
}

type LinkedInShareDialogProps = {
  credential: ShareCredential;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LinkedInShareDialog({
  credential,
  open,
  onOpenChange,
}: LinkedInShareDialogProps) {
  const fieldId = useId();
  const [template, setTemplate] = useState<ShareTemplateId>("earned");
  const [text, setText] = useState(() => buildPostText("earned", credential));
  const [copyState, setCopyState] = useState<CopyState>("idle");

  // Clear the "Copied" confirmation after a moment so it never goes stale.
  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = setTimeout(() => setCopyState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [copyState]);

  const length = text.length;
  const tooLong = length > LINKEDIN_POST_MAX_LENGTH;
  const canShare = text.trim().length > 0 && !tooLong;

  function pickTemplate(next: string) {
    const id = next as ShareTemplateId;
    setTemplate(id);
    setText(buildPostText(id, credential));
    setCopyState("idle");
  }

  async function copyOnly() {
    setCopyState((await copyToClipboard(text)) ? "copied" : "failed");
  }

  async function copyAndOpen() {
    // Opened first and synchronously: a popup blocker only trusts window.open
    // while the click's user activation is still fresh, and the clipboard
    // write below is async.
    window.open(buildLinkedInPostUrl(text), "_blank", "noopener,noreferrer");
    setCopyState((await copyToClipboard(text)) ? "copied" : "failed");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] gap-5 overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-8">
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-verified/10 px-2.5 py-1 text-xs font-medium text-verified-text">
            <BadgeCheck className="size-3.5" aria-hidden />
            Certificate issued
          </p>
          <DialogTitle className="font-display text-xl leading-snug font-semibold">
            Congrats! Share your certificate with your network
          </DialogTitle>
          <DialogDescription>
            Your credential is saved and publicly verifiable. Sharing is
            optional, and a short LinkedIn post lets employers and friends check
            it themselves.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium" id={`${fieldId}-template`}>
            Template
          </p>
          <RadioGroup
            value={template}
            onValueChange={pickTemplate}
            aria-labelledby={`${fieldId}-template`}
            className="gap-2"
          >
            {SHARE_TEMPLATES.map((option) => {
              const optionId = `${fieldId}-${option.id}`;
              return (
                <Label
                  key={option.id}
                  htmlFor={optionId}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-medium transition-colors",
                    template === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  <RadioGroupItem value={option.id} id={optionId} />
                  {option.label}
                </Label>
              );
            })}
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${fieldId}-text`}>Post text</Label>
          <Textarea
            id={`${fieldId}-text`}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setCopyState("idle");
            }}
            rows={8}
            aria-invalid={tooLong}
            className="min-h-40 resize-y"
          />
          <p
            className={cn(
              "text-xs tabular-nums",
              tooLong ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {length} / {LINKEDIN_POST_MAX_LENGTH}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-11 px-4"
              disabled={!canShare}
              onClick={() => void copyAndOpen()}
            >
              <LinkedInMark />
              Copy + open LinkedIn
              <ExternalLink aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4"
              disabled={!canShare}
              onClick={() => void copyOnly()}
            >
              {copyState === "copied" ? (
                <Check aria-hidden />
              ) : (
                <Copy aria-hidden />
              )}
              Copy only
            </Button>
          </div>
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "min-h-5 text-sm",
              copyState === "failed"
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {copyState === "copied" &&
              "Copied. If LinkedIn opened empty, paste it into the post box."}
            {copyState === "failed" &&
              "Could not copy automatically. Select the text above and copy it yourself."}
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium">Also add it to your profile</p>
          <p className="text-sm text-muted-foreground">
            Puts this credential under Licenses and certifications, with a link
            back to its verification page, so it stays on your profile after the
            post scrolls away.
          </p>
          <div>
            <Button asChild variant="outline" className="h-10 px-3.5">
              <a
                href={buildAddToProfileUrl(credential)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Plus aria-hidden />
                Add to LinkedIn profile
                <ExternalLink aria-hidden />
              </a>
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            className="h-10"
            onClick={() => onOpenChange(false)}
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type LinkedInShareButtonProps = {
  credential: ShareCredential;
  /** Open the dialog by itself after this many milliseconds. Omit to never. */
  autoOpenAfterMs?: number;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
};

/**
 * A button that opens the share dialog. `autoOpenAfterMs` is for the moment a
 * credential is issued, so the congratulation arrives without a click. It
 * fires once per mount, and the button stays afterwards for anyone who closes
 * the dialog and changes their mind.
 */
export function LinkedInShareButton({
  credential,
  autoOpenAfterMs,
  variant = "default",
  size = "default",
  className,
  label = "Share on LinkedIn",
}: LinkedInShareButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (autoOpenAfterMs === undefined) return;
    const timer = setTimeout(() => setOpen(true), autoOpenAfterMs);
    return () => clearTimeout(timer);
  }, [autoOpenAfterMs]);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <LinkedInMark />
        {label}
      </Button>
      <LinkedInShareDialog
        credential={credential}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
