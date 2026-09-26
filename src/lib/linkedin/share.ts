/**
 * Everything the "share your certificate on LinkedIn" flow needs that is not
 * UI: the three post templates, the two LinkedIn URLs, and the length limit.
 * Pure functions with no browser or server dependency, so they can be tested
 * without rendering anything.
 *
 * LinkedIn has no public API for a third party to publish a post on someone's
 * behalf without an approved app and OAuth. What it does honour is a compose
 * URL that opens the post box already filled in, and the person still presses
 * Post. That is the whole integration, and it is why the dialog also copies the
 * text: the prefill parameter is undocumented and has been known to be dropped
 * on some accounts, and a copied post is the fallback that never fails.
 */

export const LINKEDIN_POST_MAX_LENGTH = 3000;

export const SHARE_TEMPLATES = [
  { id: "earned", label: "Certificate earned" },
  { id: "win", label: "Short win" },
  { id: "reflective", label: "Reflective post" },
] as const;

export type ShareTemplateId = (typeof SHARE_TEMPLATES)[number]["id"];

export type ShareCredential = {
  title: string;
  credentialCode: string;
  /** ISO timestamp the credential was issued. */
  issuedAt: string;
  /** Absolute origin of the site, no trailing slash. */
  siteUrl: string;
};

const ORGANIZATION_NAME = "GN Academy";

export function verifyUrlFor(credential: ShareCredential): string {
  const origin = credential.siteUrl.replace(/\/+$/, "");
  return `${origin}/verify/${encodeURIComponent(credential.credentialCode)}`;
}

/**
 * The starting text for a template. Written to be posted as it stands, with no
 * bracketed blanks the learner could forget to fill in and publish by accident.
 * The verify link is in every one of them, because the link is what makes the
 * post proof rather than a claim.
 */
export function buildPostText(
  template: ShareTemplateId,
  credential: ShareCredential,
): string {
  const url = verifyUrlFor(credential);
  const { title } = credential;

  switch (template) {
    case "win":
      return [
        `Small win today: I passed the ${title} exam at ${ORGANIZATION_NAME}.`,
        `Verify it here: ${url}`,
        "#GNAcademy #AI #Learning",
      ].join("\n\n");
    case "reflective":
      return [
        `I just finished ${title} at ${ORGANIZATION_NAME}. The exam was the most useful part, because it showed me exactly what I still had to tighten up before I could say I knew it.`,
        `If you are deciding whether a short, structured course is worth your time, it was for me. My credential is public and anyone can check it: ${url}`,
        "#GNAcademy #ContinuousLearning #AI",
      ].join("\n\n");
    case "earned":
    default:
      return [
        `Just earned my ${title} certificate from ${ORGANIZATION_NAME}, completed online and verified with a public credential code.`,
        `Verify it here: ${url}`,
        "Excited to keep building. #GNAcademy #AI #Learning",
      ].join("\n\n");
  }
}

/**
 * Opens LinkedIn's post composer with the text filled in. `shareActive=true` is
 * what makes the composer open on top of the feed.
 */
export function buildLinkedInPostUrl(text: string): string {
  const params = new URLSearchParams({ shareActive: "true", text });
  return `https://www.linkedin.com/feed/?${params.toString()}`;
}

/**
 * Opens LinkedIn's "Add license or certification" form with the fields filled
 * in, which puts the credential on the learner's profile itself rather than in
 * a post that scrolls away. `certUrl` and `certId` are what let a profile
 * visitor click through to the verification page.
 */
export function buildAddToProfileUrl(credential: ShareCredential): string {
  const issued = new Date(credential.issuedAt);
  const valid = !Number.isNaN(issued.getTime());
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: credential.title,
    organizationName: ORGANIZATION_NAME,
    certUrl: verifyUrlFor(credential),
    certId: credential.credentialCode,
  });
  if (valid) {
    params.set("issueYear", String(issued.getUTCFullYear()));
    params.set("issueMonth", String(issued.getUTCMonth() + 1));
  }
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}
