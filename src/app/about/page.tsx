import type { Metadata } from "next";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = {
  title: "About",
  description: "Why GN Academy exists and what a verified credential means.",
};

export default function AboutPage() {
  return (
    <PageShell title="About GN Academy">
      <p>
        GN Academy certifies AI-ready Filipino talent. We exist because
        &ldquo;knows how to use AI&rdquo; is on every CV and verifiable on
        almost none — employers need proof, and talented people deserve a way
        to give it.
      </p>
      {/* TODO(blocked): brand relationship (GN Club / MAZAL) — waiting on a
          business decision, see BLOCKED.md. Keep this page generic until then. */}
      <p>
        Every credential we issue has a public verification page any employer
        can check in seconds. That is the whole model: learn, prove it, get
        hired.
      </p>
    </PageShell>
  );
}
