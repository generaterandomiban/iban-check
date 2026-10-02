import { COUNTRIES } from "./countries.js";
import { normalizeIBAN } from "./normalize.js";
import type { CountryInfo } from "./types.js";

const CHARSETS = { n: "[0-9]", a: "[A-Z]", c: "[A-Z0-9]" } as const;
const STRUCTURE_TOKEN = /(\d+)!([nac])/g;

// Built on first use so that importing the package has no side effects.
let countriesByCode: Map<string, CountryInfo> | undefined;
let bbanPatterns: Map<string, RegExp> | undefined;

/** Registry entry for an exact, uppercase country code. */
export function findCountry(countryCode: string): CountryInfo | undefined {
  countriesByCode ??= new Map(COUNTRIES.map((country) => [country.countryCode, country]));
  return countriesByCode.get(countryCode);
}

/** Whether `bban` matches the registry BBAN structure of `country` (e.g. "1!a5!n5!n12!c"). */
export function matchesBBANStructure(country: CountryInfo, bban: string): boolean {
  bbanPatterns ??= new Map();
  let pattern = bbanPatterns.get(country.countryCode);
  if (!pattern) {
    pattern = compileStructure(country.bbanStructure);
    bbanPatterns.set(country.countryCode, pattern);
  }
  return pattern.test(bban);
}

function compileStructure(structure: string): RegExp {
  const source = structure.replace(
    STRUCTURE_TOKEN,
    // STRUCTURE_TOKEN only matches the types n, a and c.
    (_token: string, count: string, type: keyof typeof CHARSETS) => `${CHARSETS[type]}{${count}}`,
  );
  return new RegExp(`^${source}$`);
}

function copyCountry(country: CountryInfo): CountryInfo {
  const { bankIdentifierPosition: bank, branchIdentifierPosition: branch } = country;
  return {
    ...country,
    bankIdentifierPosition: bank && { ...bank },
    branchIdentifierPosition: branch && { ...branch },
  };
}

/**
 * IBAN format of a country, or `null` if the country is not in the IBAN registry.
 * The country code is case-insensitive and surrounding whitespace is ignored.
 *
 * @example getCountryInfo("it")?.ibanLength // 27
 */
export function getCountryInfo(countryCode: string): CountryInfo | null {
  if (typeof countryCode !== "string") return null;
  const country = findCountry(normalizeIBAN(countryCode));
  return country ? copyCountry(country) : null;
}

/** All countries in the IBAN registry, sorted by country code. */
export function getSupportedCountries(): CountryInfo[] {
  return COUNTRIES.map(copyCountry);
}
