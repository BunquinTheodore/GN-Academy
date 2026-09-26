import { describe, expect, it } from "vitest";
import {
  LINKEDIN_POST_MAX_LENGTH,
  SHARE_TEMPLATES,
  buildAddToProfileUrl,
  buildLinkedInPostUrl,
  buildPostText,
  verifyUrlFor,
  type ShareCredential,
} from "@/lib/linkedin/share";

const credential: ShareCredential = {
  title: "Basic AI",
  credentialCode: "BAI-2026-000042",
  issuedAt: "2026-09-26T04:30:00.000Z",
  siteUrl: "https://gn-academy-phi.vercel.app/",
};

describe("verifyUrlFor", () => {
  it("builds the public verify link without a doubled slash", () => {
    expect(verifyUrlFor(credential)).toBe(
      "https://gn-academy-phi.vercel.app/verify/BAI-2026-000042",
    );
  });
});

describe("buildPostText", () => {
  it.each(SHARE_TEMPLATES.map((t) => t.id))(
    "the %s template names the course and carries the verify link",
    (id) => {
      const text = buildPostText(id, credential);
      expect(text).toContain("Basic AI");
      expect(text).toContain("GN Academy");
      expect(text).toContain(verifyUrlFor(credential));
    },
  );

  it.each(SHARE_TEMPLATES.map((t) => t.id))(
    "the %s template fits LinkedIn's limit and has no blanks left to fill in",
    (id) => {
      const text = buildPostText(id, credential);
      expect(text.length).toBeLessThan(LINKEDIN_POST_MAX_LENGTH);
      expect(text).not.toMatch(/[\[\]{}]/);
    },
  );

  it.each(SHARE_TEMPLATES.map((t) => t.id))(
    "the %s template uses no em or en dashes",
    (id) => {
      expect(buildPostText(id, credential)).not.toMatch(/[\u2013\u2014]/);
    },
  );

  it("gives each template different wording", () => {
    const texts = SHARE_TEMPLATES.map((t) => buildPostText(t.id, credential));
    expect(new Set(texts).size).toBe(SHARE_TEMPLATES.length);
  });
});

describe("buildLinkedInPostUrl", () => {
  it("opens the feed composer with the text encoded", () => {
    const url = new URL(buildLinkedInPostUrl("Hello & welcome #AI\n\nline two"));
    expect(url.origin + url.pathname).toBe("https://www.linkedin.com/feed/");
    expect(url.searchParams.get("shareActive")).toBe("true");
    expect(url.searchParams.get("text")).toBe("Hello & welcome #AI\n\nline two");
  });
});

describe("buildAddToProfileUrl", () => {
  it("fills LinkedIn's add-certification form and links back to verification", () => {
    const url = new URL(buildAddToProfileUrl(credential));
    expect(url.origin + url.pathname).toBe(
      "https://www.linkedin.com/profile/add",
    );
    expect(url.searchParams.get("startTask")).toBe("CERTIFICATION_NAME");
    expect(url.searchParams.get("name")).toBe("Basic AI");
    expect(url.searchParams.get("organizationName")).toBe("GN Academy");
    expect(url.searchParams.get("certId")).toBe("BAI-2026-000042");
    expect(url.searchParams.get("certUrl")).toBe(verifyUrlFor(credential));
    expect(url.searchParams.get("issueYear")).toBe("2026");
    expect(url.searchParams.get("issueMonth")).toBe("9");
  });

  it("leaves the date out rather than sending NaN when the timestamp is bad", () => {
    const url = new URL(
      buildAddToProfileUrl({ ...credential, issuedAt: "not a date" }),
    );
    expect(url.searchParams.has("issueYear")).toBe(false);
    expect(url.searchParams.has("issueMonth")).toBe(false);
  });
});
