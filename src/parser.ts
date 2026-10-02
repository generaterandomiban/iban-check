import type { BBANPosition, IBANDetails } from "./types.js";
import { analyzeIBAN, hasBasicFormat } from "./validate.js";

function slice(bban: string, position: BBANPosition | null): string | null {
  return position ? bban.slice(position.start, position.end) : null;
}

/**
 * Splits an IBAN into the parts encoded in it: country code, check digits, BBAN and,
 * where the registry defines their position, the bank and branch identifier codes.
 *
 * Never throws: invalid input returns `valid: false` with as many fields filled as the
 * input allows. No bank or branch names are looked up; that would need external data.
 *
 * @example
 * parseIBAN("IT60X0542811101000000123456").bankIdentifier // "05428"
 */
export function parseIBAN(iban: string): IBANDetails {
  const { iban: input, normalized, country, error } = analyzeIBAN(iban);
  const structured = hasBasicFormat(normalized);
  const bban = structured ? normalized.slice(4) : null;
  const positioned = bban !== null && country !== null && normalized.length === country.ibanLength;

  return {
    iban: input,
    normalized,
    valid: error === null,
    error,
    countryCode: structured ? normalized.slice(0, 2) : null,
    countryName: country?.countryName ?? null,
    checkDigits: structured ? normalized.slice(2, 4) : null,
    bban,
    length: normalized.length,
    bankIdentifier: positioned ? slice(bban, country.bankIdentifierPosition) : null,
    branchIdentifier: positioned ? slice(bban, country.branchIdentifierPosition) : null,
    sepa: country?.sepa ?? null,
  };
}
