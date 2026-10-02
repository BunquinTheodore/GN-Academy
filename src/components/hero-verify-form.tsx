"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import {
  normalizeCredentialCode,
  verifyPathForCode,
} from "@/lib/credentials/code-input";

/**
 * The employer lane of the hero: type a credential code, land on its public
 * verification page. It is the product proving itself before anyone has read a
 * word, and it needs no account.
 */
export function HeroVerifyForm() {
  const router = useRouter();
  const fieldId = useId();
  const [value, setValue] = useState("");
  const [missing, setMissing] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = normalizeCredentialCode(value);
    if (!code) {
      setMissing(true);
      return;
    }
    router.push(verifyPathForCode(code));
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="gn-shine relative isolate flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] p-5 shadow-[0_24px_70px_-32px_color-mix(in_oklab,var(--brand)_60%,transparent),inset_0_1px_0_rgb(255_255_255/0.18)] backdrop-blur-xl sm:p-6"
    >
      <label htmlFor={fieldId} className="text-base font-semibold text-white">
        Hiring? Check a credential.
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={fieldId}
          name="code"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (missing) setMissing(false);
          }}
          placeholder="CAVA-2026-000001"
          aria-invalid={missing}
          aria-describedby={`${fieldId}-hint`}
          className="h-12 min-w-0 flex-1 rounded-xl border border-white/20 bg-black/30 px-4 font-mono text-sm tracking-wide text-white outline-none placeholder:text-white/35 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/40 aria-invalid:border-red-300/70"
        />
        <button
          type="submit"
          className="font-ui inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-medium text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:outline-none"
        >
          Check
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
      <p
        id={`${fieldId}-hint`}
        role={missing ? "alert" : undefined}
        className={missing ? "text-sm text-red-200" : "text-sm text-white/60"}
      >
        {missing
          ? "Enter the credential code first. It is printed on the certificate."
          : "No account needed. You see exactly what the holder earned."}
      </p>
    </form>
  );
}
