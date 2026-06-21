// RFC 5322-lite: good enough to reject garbage without rejecting real addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Accepts +972/972/0 prefixed Israeli/Palestinian mobile numbers (05X-XXXXXXX)
// as well as general international numbers (+<country><7-14 digits>), since
// signers may register with "Other" nationality and a non-local number.
const IL_MOBILE_RE = /^(?:\+972|972|0)5\d-?\d{3}-?\d{4}$/;
const INTL_PHONE_RE = /^\+\d{7,15}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim();
  return IL_MOBILE_RE.test(trimmed) || INTL_PHONE_RE.test(trimmed);
}

// Converts a local Israeli/Palestinian mobile number (e.g. "050-1234567" or
// "0501234567") into E.164 format required by Firebase phone auth. Numbers
// already given with a country code (+972... or 972...) pass through as-is.
export function toE164(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/[\s-]/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("0")) return `+972${digits.slice(1)}`;
  return `+${digits}`;
}
