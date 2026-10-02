import { findCountry, matchesBBANStructure } from "./country-info.js";
import { isValidChecksum } from "./mod97.js";
import { normalizeIBAN } from "./normalize.js";
import type { CountryInfo, IBANErrorCode, ValidationResult } from "./types.js";

const VALID_CHARACTERS = /^[A-Z0-9]+$/;
const BASIC_FORMAT = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;

const MESSAGES: Readonly<Record<IBANErrorCode, string>> = {
  INVALID_INPUT: "The input must be a string.",
  EMPTY_INPUT: "The input is empty.",
  INVALID_CHARACTERS: "An IBAN may only contain letters A-Z, digits 0-9 and spaces.",
  INVALID_FORMAT:
    "An IBAN must start with a two-letter country code followed by two check digits and the BBAN.",
  INVALID_COUNTRY: "The country code is not in the IBAN registry.",
  INVALID_LENGTH: "The IBAN length does not match the length defined for its country.",
  INVALID_BBAN_FORMAT: "The BBAN does not match the structure defined for its country.",
  INVALID_CHECKSUM: "The check digits are wrong (MOD-97 check failed).",
};

interface AnalysisBase {
  iban: string;
  normalized: string;
}

/** Outcome of all validation steps, shared by `validateIBAN()` and `parseIBAN()`. */
export type Analysis =
  | (AnalysisBase & { error: null; country: CountryInfo; checksumValid: true })
  | (AnalysisBase & { error: IBANErrorCode; country: CountryInfo | null; checksumValid: boolean });

/** Whether a normalized IBAN has the shape `CC00…` (country code, check digits, BBAN). */
export function hasBasicFormat(normalized: string): boolean {
  return BASIC_FORMAT.test(normalized);
}

export function analyzeIBAN(input: unknown): Analysis {
  if (typeof input !== "string") {
    return {
      iban: "",
      normalized: "",
      error: "INVALID_INPUT",
      country: null,
      checksumValid: false,
    };
  }

  const normalized = normalizeIBAN(input);
  const fail = (
    error: IBANErrorCode,
    country: CountryInfo | null = null,
    checksumValid = false,
  ): Analysis => ({ iban: input, normalized, error, country, checksumValid });

  if (normalized === "") return fail("EMPTY_INPUT");
  if (!VALID_CHARACTERS.test(normalized)) return fail("INVALID_CHARACTERS");
  if (!hasBasicFormat(normalized)) return fail("INVALID_FORMAT");

  const checksumValid = isValidChecksum(normalized);
  const country = findCountry(normalized.slice(0, 2));

  if (!country) return fail("INVALID_COUNTRY", null, checksumValid);
  if (normalized.length !== country.ibanLength) {
    return fail("INVALID_LENGTH", country, checksumValid);
  }
  if (!matchesBBANStructure(country, normalized.slice(4))) {
    return fail("INVALID_BBAN_FORMAT", country, checksumValid);
  }
  if (!checksumValid) return fail("INVALID_CHECKSUM", country);

  return { iban: input, normalized, error: null, country, checksumValid: true };
}

/**
 * Validates an IBAN and explains the result.
 *
 * Whitespace and letter case are ignored (see `normalizeIBAN()`). The IBAN must use a
 * country from the registry, have that country's length and BBAN structure, and pass
 * the ISO 7064 MOD 97-10 check.
 *
 * @example
 * const result = validateIBAN("IT60 X054 2811 1010 0000 0123 456");
 * if (!result.valid) console.log(result.error, result.message);
 */
export function validateIBAN(iban: string): ValidationResult {
  const analysis = analyzeIBAN(iban);
  const { country } = analysis;
  const base = {
    iban: analysis.iban,
    normalized: analysis.normalized,
    length: analysis.normalized.length,
  };

  if (analysis.error === null) {
    return {
      valid: true,
      ...base,
      country: analysis.country.countryCode,
      countryName: analysis.country.countryName,
      expectedLength: analysis.country.ibanLength,
      checksumValid: true,
    };
  }

  return {
    valid: false,
    ...base,
    country: country?.countryCode ?? null,
    countryName: country?.countryName ?? null,
    expectedLength: country?.ibanLength ?? null,
    checksumValid: analysis.checksumValid,
    error: analysis.error,
    message: MESSAGES[analysis.error],
  };
}

/**
 * `true` if the IBAN is valid. Same rules as `validateIBAN()`.
 *
 * @example isValidIBAN("DE89 3704 0044 0532 0130 00") // true
 */
export function isValidIBAN(iban: string): boolean {
  return analyzeIBAN(iban).error === null;
}
