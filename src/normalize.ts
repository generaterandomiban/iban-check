const WHITESPACE = /\s+/g;
const ASCII_LOWERCASE = /[a-z]+/g;

/**
 * Converts an IBAN to its electronic format: removes all whitespace (spaces, tabs,
 * line breaks, non-breaking spaces) and uppercases ASCII letters.
 *
 * Nothing else is changed: dashes, dots and other characters are kept so that
 * validation can reject them. Non-ASCII letters are not case-mapped, so look-alike
 * characters such as the Turkish dotless "ı" cannot turn into a valid "I".
 *
 * This function does not validate.
 *
 * @example normalizeIBAN("it60 x054 2811 1010 0000 0123 456") // "IT60X0542811101000000123456"
 * @throws {TypeError} if `iban` is not a string.
 */
export function normalizeIBAN(iban: string): string {
  // Widened to `unknown` to guard JavaScript callers that pass something else.
  const value: unknown = iban;
  if (typeof value !== "string") {
    throw new TypeError(`Expected a string, received ${value === null ? "null" : typeof value}`);
  }
  return value.replace(WHITESPACE, "").replace(ASCII_LOWERCASE, (letters) => letters.toUpperCase());
}
