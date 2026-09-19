import type { Metadata } from "next";
import Image from "next/image";
import { Camera, Mail } from "lucide-react";
import { advocacy } from "@/content/advocacy";
import { site } from "@/content/site";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SpeakerBookingForm } from "./speaker-booking-form";

export const metadata: Metadata = {
  title: "Speaker booking",
  description: advocacy.speakerBooking.body,
};

/**
 * On-stage imagery for the Speaker Booking page. Falls back to the dashed
 * placeholder (see `ProofOfWorkGallery`'s `PhotoSlot` for the same pattern)
 * when a slot's file has not been supplied yet under `public/speaker-booking/`,
 * so a missing photo never renders a broken `<img>`.
 */
function StagePhoto({ file, alt }: { file: string; alt: string }) {
  const supplied = new Set(["speaker-jops-01.jpg", "speaker-jops-02.jpg"]);

  if (!supplied.has(file)) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="glass-panel glass-panel-strong flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-2xl border-dashed p-6 text-center"
      >
        <Camera className="size-7 text-muted-foreground/70" aria-hidden />
        <p className="font-mono text-xs text-muted-foreground">{file}</p>
        <p className="max-w-[22ch] text-xs leading-snug text-muted-foreground">
          {alt}
        </p>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border">
      <Image
        src={`/speaker-booking/${file}`}
        alt={alt}
        fill
        sizes="(min-width: 640px) 50vw, 100vw"
        className="object-cover"
      />
    </div>
  );
}

export default function SpeakerBookingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 pt-14 pb-4 sm:pt-16">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            {advocacy.speakerBooking.eyebrow}
          </p>
          <h1 className="font-display mt-3 max-w-2xl text-3xl font-semibold text-balance sm:text-4xl">
            {advocacy.speakerBooking.heading}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            {advocacy.speakerBooking.body}
          </p>
        </section>

        {/* ── On-stage imagery ────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-6xl px-4 py-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {advocacy.speakerBooking.imagery.map((photo) => (
              <StagePhoto key={photo.file} file={photo.file} alt={photo.alt} />
            ))}
          </div>
        </section>

        {/* ── Inquiry form ─────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-3xl px-4 pb-20">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">
            {advocacy.speakerBooking.form.heading}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {advocacy.speakerBooking.form.body}
          </p>

          <div className="mt-6">
            <SpeakerBookingForm />
          </div>

          <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-4" aria-hidden />
            {advocacy.speakerBooking.directContact.body}{" "}
            <a
              href={`mailto:${site.contactEmail}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {site.contactEmail}
            </a>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
