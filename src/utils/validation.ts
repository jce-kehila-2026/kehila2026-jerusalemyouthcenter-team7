// RFC 5322-lite: good enough to reject garbage without rejecting real addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Only the characters a phone number can legitimately be typed with —
// catches "abc" or other free text before it ever reaches digit logic.
const PHONE_CHARS_RE = /^[\d+\s-]+$/;

// Letters (Latin/Hebrew/Arabic with diacritics), spaces, hyphens and
// apostrophes only — rejects names that are actually numbers or symbols.
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿא-תء-ي](?:[A-Za-zÀ-ÖØ-öø-ÿא-תء-ي'\- ]{0,58}[A-Za-zÀ-ÖØ-öø-ÿא-תء-ي'])?$/;

const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isValidName(name: string): boolean {
  return NAME_RE.test(name.trim());
}

// Converts a phone number entered as "0501234567", "972501234567" or
// "+972501234567" into the bare national number ("501234567"). Used as a
// stable identity key so the same physical number always maps to the same
// join_requests doc / login email regardless of which format it was typed
// or stored in.
export function phoneDigitsKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits.slice(3);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

// Converts any accepted input format into E.164 (+972XXXXXXXXX) for storage.
export function toE164(phone: string): string {
  const national = phoneDigitsKey(phone.trim());
  return `+972${national}`;
}

// Israeli/Palestinian mobile numbers only (05X-XXXXXXX), always normalized
// to +972 before being checked — this is what every phone field in the app
// must satisfy, regardless of how the user typed it in.
export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!PHONE_CHARS_RE.test(trimmed)) return false;
  return /^\+9725\d{8}$/.test(toE164(trimmed));
}

export function isValidAge(age: string): boolean {
  const trimmed = age.trim();
  if (!/^\d{1,2}$/.test(trimmed)) return false;
  const n = Number(trimmed);
  return n >= 10 && n <= 19;
}

// Address/neighborhood must be descriptive text, not house/street numbers.
export function hasNoDigits(text: string): boolean {
  return !/\d/.test(text);
}

export function isValidYear(year: string): boolean {
  const trimmed = year.trim();
  if (!/^\d{4}$/.test(trimmed)) return false;
  const n = Number(trimmed);
  return n >= 2000 && n <= new Date().getFullYear();
}

// Reformats whatever digits the user has typed so far into "DD/MM/YYYY",
// inserting the slashes automatically — the user only ever types digits.
export function formatBirthDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Strict DD/MM/YYYY check — rejects impossible calendar dates (32/01/2020),
// future dates, and ages outside a plausible human range.
export function isValidBirthDate(date: string): boolean {
  const m = DATE_RE.exec(date.trim());
  if (!m) return false;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  )
    return false;

  const now = new Date();
  if (parsed > now) return false;
  const age = now.getFullYear() - year;
  return age >= 5 && age <= 100;
}
