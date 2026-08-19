/** ₱1,499 — locale rules from §2. */
export function formatPhp(amount: number): string {
  return `₱${new Intl.NumberFormat("en-PH").format(amount)}`;
}

/** 16 August 2026, Asia/Manila. en-GB gives the day-first order §2 requires. */
export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}
