/**
 * Where the money goes.
 *
 * There is no payment gateway at this stage: a learner sends GCash or Maya
 * to a receiving account and types the receipt's reference number into the
 * enrollment form, and staff match it by hand. That receiving account is
 * configuration, not code — it changes when the business changes bank
 * details, which must not require a developer, a commit, and a deploy.
 *
 * These are NEXT_PUBLIC_ on purpose: the instructions are printed on a page
 * anyone signed in can read, and a receiving number is not a secret. They
 * are read directly from process.env rather than through the Zod env gate
 * because the app has to boot and sell the free course without them.
 */

export type PaymentChannel = {
  key: "gcash" | "maya";
  label: string;
  accountName: string;
  accountNumber: string;
  /**
   * Optional QR image. Scanning beats retyping an eleven-digit number on a
   * phone, which is where most of this traffic is, so when a QR exists it is
   * shown alongside the number rather than instead of it — the number stays
   * for anyone paying from another device.
   */
  qrUrl: string | null;
};

function channel(
  key: PaymentChannel["key"],
  label: string,
  accountName: string,
  accountNumber: string,
  qrUrl: string,
): PaymentChannel | null {
  const name = accountName.trim();
  const number = accountNumber.trim();
  // Half a payment instruction is worse than none — a number with no name to
  // check it against is exactly what a scam looks like.
  if (!name || !number) return null;
  return {
    key,
    label,
    accountName: name,
    accountNumber: number,
    qrUrl: qrUrl.trim() || null,
  };
}

export const paymentChannels: PaymentChannel[] = [
  channel(
    "gcash",
    "GCash",
    process.env.NEXT_PUBLIC_PAYMENT_GCASH_NAME ?? "",
    process.env.NEXT_PUBLIC_PAYMENT_GCASH_NUMBER ?? "",
    process.env.NEXT_PUBLIC_PAYMENT_GCASH_QR ?? "",
  ),
  channel(
    "maya",
    "Maya",
    process.env.NEXT_PUBLIC_PAYMENT_MAYA_NAME ?? "",
    process.env.NEXT_PUBLIC_PAYMENT_MAYA_NUMBER ?? "",
    process.env.NEXT_PUBLIC_PAYMENT_MAYA_QR ?? "",
  ),
].filter((c): c is PaymentChannel => c !== null);

export const paymentDetailsPublished = paymentChannels.length > 0;
