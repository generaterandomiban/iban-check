/**
 * Why an IBAN was rejected. Checks run in this order and the first failure is reported:
 *
 * - `INVALID_INPUT`: the input is not a string (only reachable from untyped JavaScript).
 * - `EMPTY_INPUT`: the input is empty or contains only whitespace.
 * - `INVALID_CHARACTERS`: the input contains characters other than A-Z, a-z, 0-9 and whitespace.
 * - `INVALID_FORMAT`: the input does not start with 2 letters (country code) followed by
 *   2 digits (check digits) and at least one BBAN character.
 * - `INVALID_COUNTRY`: the country code is not in the IBAN registry.
 * - `INVALID_LENGTH`: the length does not match the length defined for the country.
 * - `INVALID_BBAN_FORMAT`: the BBAN does not match the structure defined for the country
 *   (for example a letter where the registry requires a digit).
 * - `INVALID_CHECKSUM`: the ISO 7064 MOD 97-10 check failed.
 */
export type IBANErrorCode =
  | "INVALID_INPUT"
  | "EMPTY_INPUT"
  | "INVALID_CHARACTERS"
  | "INVALID_FORMAT"
  | "INVALID_COUNTRY"
  | "INVALID_LENGTH"
  | "INVALID_BBAN_FORMAT"
  | "INVALID_CHECKSUM";

/** Position of a component inside the BBAN: zero-based, `end` exclusive (use `bban.slice(start, end)`). */
export interface BBANPosition {
  readonly start: number;
  readonly end: number;
}

/** IBAN format of a country, as published in the SWIFT IBAN Registry. */
export interface CountryInfo {
  /** ISO 3166-1 alpha-2 code used as IBAN prefix, e.g. `"IT"`. */
  readonly countryCode: string;
  /** Country name exactly as written in the SWIFT IBAN Registry. */
  readonly countryName: string;
  /** Total IBAN length in the electronic format. */
  readonly ibanLength: number;
  /** Length of the BBAN (the part after country code and check digits). */
  readonly bbanLength: number;
  /**
   * BBAN structure in SWIFT notation: `n` = digits, `a` = uppercase letters,
   * `c` = uppercase letters or digits, `!` = fixed length. Example: `"1!a5!n5!n12!c"`.
   */
  readonly bbanStructure: string;
  /** Whether the registry lists the country as part of the SEPA scheme. */
  readonly sepa: boolean;
  /** Position of the bank identifier inside the BBAN, or `null` if the registry defines none. */
  readonly bankIdentifierPosition: BBANPosition | null;
  /** Position of the branch identifier inside the BBAN, or `null` if the registry defines none. */
  readonly branchIdentifierPosition: BBANPosition | null;
  /** Example IBAN published in the registry (electronic format). It only illustrates the format. */
  readonly example: string;
}

interface ValidationResultBase {
  /** The input exactly as received (`""` if the input was not a string). */
  iban: string;
  /** The input after `normalizeIBAN()`. */
  normalized: string;
  /** Country code if it is in the registry, otherwise `null`. */
  country: string | null;
  /** Country name from the registry, otherwise `null`. */
  countryName: string | null;
  /** Length of the normalized IBAN. */
  length: number;
  /** IBAN length defined for the country, or `null` if the country is unknown. */
  expectedLength: number | null;
  /**
   * Whether the ISO 7064 MOD 97-10 check passes. Computed whenever the input has a
   * valid basic format, independently of the country, length and BBAN checks.
   */
  checksumValid: boolean;
}

export interface ValidIBANResult extends ValidationResultBase {
  valid: true;
  country: string;
  countryName: string;
  expectedLength: number;
  checksumValid: true;
}

export interface InvalidIBANResult extends ValidationResultBase {
  valid: false;
  /** Machine-readable reason. */
  error: IBANErrorCode;
  /** Human-readable explanation in English. */
  message: string;
}

export type ValidationResult = ValidIBANResult | InvalidIBANResult;

/**
 * Structural information encoded in an IBAN.
 *
 * Everything here is read directly from the IBAN string. Bank or branch *names* are not
 * encoded in an IBAN and would require an external directory, so they are not provided.
 */
export interface IBANDetails {
  /** The input exactly as received (`""` if the input was not a string). */
  iban: string;
  /** The input after `normalizeIBAN()`. */
  normalized: string;
  /** Whether the IBAN passed every check of `validateIBAN()`. */
  valid: boolean;
  /** Reason the IBAN is invalid, `null` when valid. */
  error: IBANErrorCode | null;
  /** First two characters, when the basic format is valid. */
  countryCode: string | null;
  /** Country name from the registry, or `null` if the country is unknown. */
  countryName: string | null;
  /** Characters 3-4, when the basic format is valid. */
  checkDigits: string | null;
  /** Everything after the check digits, when the basic format is valid. */
  bban: string | null;
  /** Length of the normalized IBAN. */
  length: number;
  /**
   * Bank identifier code at the registry-defined position (e.g. the ABI in Italy).
   * Only set when the country is known and the length is correct. No bank name is looked up.
   */
  bankIdentifier: string | null;
  /** Branch identifier code at the registry-defined position. Same conditions as `bankIdentifier`. */
  branchIdentifier: string | null;
  /** Whether the registry lists the country as part of SEPA, or `null` if the country is unknown. */
  sepa: boolean | null;
}
