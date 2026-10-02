import { buildAddToProfileUrl } from "@/lib/linkedin/share";

/** The fields of a credential row this decision needs. */
export type AddToProfileCredential = {
  credential_code: string;
  user_id: string | null;
  title: string;
  issued_at: string;
  expires_at: string | null;
  status: "active" | "revoked" | "expired";
};

export type AddToProfileDecision =
  | { kind: "login"; location: string }
  | { kind: "not-found" }
  | { kind: "gone"; message: string }
  | { kind: "redirect"; location: string };

type DecideInput = {
  /** The code from the URL, used to come back here after signing in. */
  code: string;
  /** Firebase UID of the signed-in user, or null when signed out. */
  sessionUid: string | null;
  /** The credential for the requested code, or null when none exists. */
  credential: AddToProfileCredential | null;
  siteUrl: string;
  organizationId?: string | null;
  now: Date;
};

export function addToLinkedInPath(code: string): string {
  return `/credentials/${encodeURIComponent(code)}/add-to-linkedin`;
}

function isExpired(credential: AddToProfileCredential, now: Date): boolean {
  if (credential.status === "expired") return true;
  if (!credential.expires_at) return false;
  const expiresAt = new Date(credential.expires_at).getTime();
  return !Number.isNaN(expiresAt) && expiresAt <= now.getTime();
}

/**
 * Decides what the add-to-LinkedIn route should do. Pure so the access rules
 * can be tested without a session or a database. A credential that is missing
 * and one that belongs to someone else look the same ("not-found") so the
 * route never confirms that a code exists.
 */
export function decideAddToProfile(input: DecideInput): AddToProfileDecision {
  const { code, sessionUid, credential, siteUrl, organizationId, now } = input;

  if (!sessionUid) {
    return {
      kind: "login",
      location: `/login?next=${encodeURIComponent(addToLinkedInPath(code))}`,
    };
  }

  if (!credential || credential.user_id !== sessionUid) {
    return { kind: "not-found" };
  }

  if (credential.status === "revoked") {
    return {
      kind: "gone",
      message: "This credential has been revoked and cannot be added to a profile.",
    };
  }
  if (isExpired(credential, now)) {
    return {
      kind: "gone",
      message: "This credential has expired and cannot be added to a profile.",
    };
  }

  return {
    kind: "redirect",
    location: buildAddToProfileUrl({
      title: credential.title,
      credentialCode: credential.credential_code,
      issuedAt: credential.issued_at,
      expiresAt: credential.expires_at,
      siteUrl,
      organizationId,
    }),
  };
}
