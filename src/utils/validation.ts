export const isValidEmail = (text: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());

// Israeli mobile numbers are 9 local digits starting with 5 (the national
// "0" and "+972" prefixes are handled separately by the caller).
export const isValidIsraeliLocalMobile = (digits: string): boolean =>
  /^5\d{8}$/.test(digits);
