/**
 * Test vectors and their provenance. See also COUNTRY_DATA_SOURCES.md.
 *
 * Three kinds of IBANs are used in the tests, and they are kept apart on purpose:
 *
 * 1. DOCUMENTED examples (this file): published by an authoritative source. They are
 *    illustrative examples, not necessarily real bank accounts. Do not use them for payments.
 * 2. REGISTRY examples: the example of every country in the SWIFT IBAN Registry, read from
 *    `COUNTRIES[n].example` in src/countries.ts (copied verbatim from the registry).
 * 3. SYNTHETIC IBANs: built inside the tests by computing check digits with an independent
 *    BigInt reference implementation (`withCheckDigits` below). They are fictitious.
 */

export interface DocumentedIBAN {
  readonly country: string;
  readonly electronic: string;
  readonly print: string;
  readonly source: string;
}

const SWIFT_REGISTRY = "SWIFT IBAN Registry, 'IBAN electronic/print format example'";
const WIKIPEDIA = "Wikipedia, 'International Bank Account Number' (revision 1376647818)";

/** Documented valid IBANs used throughout the tests. */
export const DOCUMENTED_VALID_IBANS: readonly DocumentedIBAN[] = [
  {
    country: "IT",
    electronic: "IT60X0542811101000000123456",
    print: "IT60 X054 2811 1010 0000 0123 456",
    source: SWIFT_REGISTRY,
  },
  {
    country: "DE",
    electronic: "DE89370400440532013000",
    print: "DE89 3704 0044 0532 0130 00",
    source: SWIFT_REGISTRY,
  },
  {
    country: "FR",
    electronic: "FR1420041010050500013M02606",
    print: "FR14 2004 1010 0505 0001 3M02 606",
    source: SWIFT_REGISTRY,
  },
  {
    country: "ES",
    electronic: "ES9121000418450200051332",
    print: "ES91 2100 0418 4502 0005 1332",
    source: SWIFT_REGISTRY,
  },
  {
    country: "NL",
    electronic: "NL91ABNA0417164300",
    print: "NL91 ABNA 0417 1643 00",
    source: SWIFT_REGISTRY,
  },
  {
    country: "BE",
    electronic: "BE68539007547034",
    print: "BE68 5390 0754 7034",
    source: SWIFT_REGISTRY,
  },
  {
    country: "AT",
    electronic: "AT611904300234573201",
    print: "AT61 1904 3002 3457 3201",
    source: SWIFT_REGISTRY,
  },
  {
    country: "PT",
    electronic: "PT50000201231234567890154",
    print: "PT50 0002 0123 1234 5678 9015 4",
    source: SWIFT_REGISTRY,
  },
  {
    country: "IE",
    electronic: "IE29AIBK93115212345678",
    print: "IE29 AIBK 9311 5212 3456 78",
    source: SWIFT_REGISTRY,
  },
  {
    country: "GB",
    electronic: "GB29NWBK60161331926819",
    print: "GB29 NWBK 6016 1331 9268 19",
    source: SWIFT_REGISTRY,
  },
  {
    country: "CH",
    electronic: "CH9300762011623852957",
    print: "CH93 0076 2011 6238 5295 7",
    source: SWIFT_REGISTRY,
  },
  {
    country: "PL",
    electronic: "PL61109010140000071219812874",
    print: "PL61 1090 1014 0000 0712 1981 2874",
    source: SWIFT_REGISTRY,
  },
  {
    country: "GB",
    electronic: "GB82WEST12345698765432",
    print: "GB82 WEST 1234 5698 7654 32",
    source: `${WIKIPEDIA}, section 'Validating the IBAN'`,
  },
  {
    country: "IE",
    electronic: "IE64IRCE92050112345678",
    print: "IE64 IRCE 9205 0112 3456 78",
    source: `${WIKIPEDIA}, section 'Structure'`,
  },
  {
    country: "BI",
    electronic: "BI1320001100010000123456789",
    print: "BI13 20001 10001 00001234567 89",
    source: `${WIKIPEDIA}, section 'Structure'`,
  },
];

/**
 * Worked example from Wikipedia ('Validating the IBAN'): GB82 WEST 1234 5698 7654 32,
 * rearranged and converted to digits, gives this number, whose remainder mod 97 is 1.
 */
export const WIKIPEDIA_WORKED_EXAMPLE = {
  iban: "GB82WEST12345698765432",
  numeric: "3214282912345698765432161182",
} as const;

/** Reference ISO 7064 MOD 97-10 using BigInt. Test-only, independent from src/mod97.ts. */
export function referenceMod97(value: string): number {
  const digits = value.replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));
  return Number(BigInt(digits) % 97n);
}

/** Builds a synthetic IBAN with correct check digits for `country` + `bban`. */
export function withCheckDigits(country: string, bban: string): string {
  const checkDigits = 98 - referenceMod97(`${bban}${country}00`);
  return `${country}${String(checkDigits).padStart(2, "0")}${bban}`;
}

/** Small deterministic PRNG (mulberry32) so synthetic test data is reproducible. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHABETS: Readonly<Record<string, string>> = {
  n: "0123456789",
  a: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  c: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
};

/** Random BBAN matching a SWIFT structure such as "4!a6!n8!n". */
export function randomBBAN(structure: string, random: () => number): string {
  let bban = "";
  for (const [, count, type] of structure.matchAll(/(\d+)!([nac])/g)) {
    const alphabet = ALPHABETS[type ?? ""] ?? "";
    for (let i = 0; i < Number(count); i++) {
      bban += alphabet.charAt(Math.floor(random() * alphabet.length));
    }
  }
  return bban;
}
