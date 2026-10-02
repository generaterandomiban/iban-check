import { describe, expect, it } from "vitest";
import { COUNTRIES } from "../src/countries.js";
import { isValidIBAN, validateIBAN } from "../src/index.js";
import type { IBANErrorCode } from "../src/index.js";
import {
  createRandom,
  DOCUMENTED_VALID_IBANS,
  randomBBAN,
  referenceMod97,
  withCheckDigits,
} from "./fixtures.js";

const IT = "IT60X0542811101000000123456";

function errorOf(input: string): IBANErrorCode | null {
  const result = validateIBAN(input);
  return result.valid ? null : result.error;
}

describe("validateIBAN: documented valid IBANs", () => {
  it.each(DOCUMENTED_VALID_IBANS)("$electronic ($country, $source)", ({ country, electronic }) => {
    const result = validateIBAN(electronic);
    expect(result.valid).toBe(true);
    expect(result.country).toBe(country);
    expect(result.checksumValid).toBe(true);
    expect(result.length).toBe(result.expectedLength);
  });

  it.each(DOCUMENTED_VALID_IBANS)("$print in print format", ({ print }) => {
    expect(validateIBAN(print).valid).toBe(true);
  });

  it.each(DOCUMENTED_VALID_IBANS)("$electronic in lowercase", ({ electronic }) => {
    expect(validateIBAN(electronic.toLowerCase()).valid).toBe(true);
  });

  it("returns the documented result shape for a valid IBAN", () => {
    expect(validateIBAN(IT)).toEqual({
      valid: true,
      iban: IT,
      normalized: IT,
      country: "IT",
      countryName: "Italy",
      length: 27,
      expectedLength: 27,
      checksumValid: true,
    });
  });

  it("keeps the original input in `iban` and the electronic format in `normalized`", () => {
    const result = validateIBAN(" it60 x054 2811 1010 0000 0123 456 ");
    expect(result.iban).toBe(" it60 x054 2811 1010 0000 0123 456 ");
    expect(result.normalized).toBe(IT);
    expect(result.valid).toBe(true);
  });
});

describe("validateIBAN: registry examples (every supported country)", () => {
  it.each(COUNTRIES.map((c) => [c.countryCode, c.example] as const))("%s %s", (code, example) => {
    const result = validateIBAN(example);
    expect(result).toMatchObject({ valid: true, country: code });
  });
});

describe("validateIBAN: synthetic IBANs (random BBAN + computed check digits)", () => {
  it("accepts 20 synthetic IBANs per country", () => {
    const random = createRandom(13616);
    for (const country of COUNTRIES) {
      for (let i = 0; i < 20; i++) {
        const iban = withCheckDigits(
          country.countryCode,
          randomBBAN(country.bbanStructure, random),
        );
        expect(validateIBAN(iban), iban).toMatchObject({ valid: true });
      }
    }
  });
});

describe("validateIBAN: invalid IBANs", () => {
  it("rejects a wrong checksum", () => {
    expect(validateIBAN("IT61X0542811101000000123456")).toEqual({
      valid: false,
      iban: "IT61X0542811101000000123456",
      normalized: "IT61X0542811101000000123456",
      country: "IT",
      countryName: "Italy",
      length: 27,
      expectedLength: 27,
      checksumValid: false,
      error: "INVALID_CHECKSUM",
      message: "The check digits are wrong (MOD-97 check failed).",
    });
  });

  it("rejects a wrong length with the documented result shape", () => {
    expect(validateIBAN("IT60X05428111010000001234")).toEqual({
      valid: false,
      iban: "IT60X05428111010000001234",
      normalized: "IT60X05428111010000001234",
      country: "IT",
      countryName: "Italy",
      length: 25,
      expectedLength: 27,
      checksumValid: false,
      error: "INVALID_LENGTH",
      message: "The IBAN length does not match the length defined for its country.",
    });
  });

  it("rejects truncated IBANs at every length", () => {
    for (let length = 1; length < IT.length; length++) {
      expect(isValidIBAN(IT.slice(0, length)), IT.slice(0, length)).toBe(false);
    }
  });

  it("rejects extra characters", () => {
    expect(errorOf(`${IT}0`)).toBe("INVALID_LENGTH");
    expect(errorOf(`${IT}X`)).toBe("INVALID_LENGTH");
    expect(errorOf(`0${IT}`)).toBe("INVALID_FORMAT");
    expect(errorOf(`${IT}!`)).toBe("INVALID_CHARACTERS");
  });

  it("reports the length error even when the checksum happens to pass", () => {
    // Synthetic: a German BBAN one digit too long, with correct check digits.
    const iban = withCheckDigits("DE", "3704004405320130001");
    const result = validateIBAN(iban);
    expect(result).toMatchObject({ valid: false, error: "INVALID_LENGTH", checksumValid: true });
  });

  it.each([
    ["XX", "XX60X0542811101000000123456"],
    ["US (no IBAN)", "US60X0542811101000000123456"],
    ["ZZ", "ZZ0000000000000"],
  ])("rejects an unknown country code: %s", (_label, input) => {
    expect(validateIBAN(input)).toMatchObject({
      valid: false,
      error: "INVALID_COUNTRY",
      country: null,
      countryName: null,
      expectedLength: null,
    });
  });

  it("computes checksumValid even when the country is unknown", () => {
    const synthetic = withCheckDigits("XX", "1234567890");
    expect(validateIBAN(synthetic)).toMatchObject({
      error: "INVALID_COUNTRY",
      checksumValid: true,
    });
  });

  it.each([
    ["dash", "IT60-X054-2811-1010-0000-0123-456"],
    ["dot", "IT60.X054.2811.1010.0000.0123.456"],
    ["slash", "IT60/X0542811101000000123456"],
    ["underscore", "IT60_X0542811101000000123456"],
    ["symbols", "IT60X0542811101000000123456$"],
    ["emoji", "IT60X0542811101000000123456💶"],
    ["accented letter", "IT60É0542811101000000123456"],
    ["Turkish dotless i", "ıT60X0542811101000000123456"],
    ["fullwidth digits", "IT６０X0542811101000000123456"],
    ["Arabic-Indic digits", "IT٦٠X0542811101000000123456"],
    ["zero-width space", "IT60​X0542811101000000123456"],
    ["NUL character", "IT60\u0000X0542811101000000123456"],
  ])("rejects illegal characters: %s", (_label, input) => {
    expect(validateIBAN(input)).toMatchObject({
      valid: false,
      error: "INVALID_CHARACTERS",
      country: null,
      checksumValid: false,
    });
  });

  it.each([
    ["country code only", "IT"],
    ["country code and check digits only", "IT60"],
    ["digits instead of country code", "1T60X0542811101000000123456"],
    ["letters as check digits", "ITX0X0542811101000000123456"],
    ["single letter", "I"],
    ["only digits", "60054281110100000012345"],
  ])("rejects a malformed IBAN: %s", (_label, input) => {
    expect(validateIBAN(input)).toMatchObject({ valid: false, error: "INVALID_FORMAT" });
  });

  it("rejects a BBAN that does not match the country structure", () => {
    // Synthetic: correct length and check digits, but a letter where Germany requires digits.
    const iban = withCheckDigits("DE", "37040044053201300A");
    expect(validateIBAN(iban)).toMatchObject({
      valid: false,
      error: "INVALID_BBAN_FORMAT",
      checksumValid: true,
      country: "DE",
    });
    // Italy requires a letter as first BBAN character (CIN).
    expect(errorOf(withCheckDigits("IT", "00542811101000000123456"))).toBe("INVALID_BBAN_FORMAT");
  });

  it.each([
    ["empty string", ""],
    ["spaces", "   "],
    ["tabs and newlines", "\t\n\r\n"],
  ])("rejects empty input: %s", (_label, input) => {
    expect(validateIBAN(input)).toEqual({
      valid: false,
      iban: input,
      normalized: "",
      country: null,
      countryName: null,
      length: 0,
      expectedLength: null,
      checksumValid: false,
      error: "EMPTY_INPUT",
      message: "The input is empty.",
    });
  });

  const NON_STRINGS: unknown[] = [null, undefined, 42, {}, [], true];

  it.each(NON_STRINGS)("does not throw on non-string input: %j", (input) => {
    const result = validateIBAN(input as string);
    expect(result).toMatchObject({
      valid: false,
      error: "INVALID_INPUT",
      iban: "",
      normalized: "",
    });
    expect(isValidIBAN(input as string)).toBe(false);
  });

  it("provides a message for every error", () => {
    const inputs: unknown[] = [
      null,
      "",
      "IT60!",
      "IT",
      "XX00X",
      "IT60",
      `${IT}0`,
      withCheckDigits("DE", "37040044053201300A"),
      "IT61X0542811101000000123456",
    ];
    const messages = new Set<string>();
    for (const input of inputs) {
      const result = validateIBAN(input as string);
      if (result.valid) throw new Error(`expected ${String(input)} to be invalid`);
      expect(result.message.length).toBeGreaterThan(10);
      messages.add(result.error);
    }
    expect(messages.size).toBe(8);
  });
});

describe("validateIBAN: single-character errors", () => {
  const DIGITS = "0123456789";
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  it.each(DOCUMENTED_VALID_IBANS)(
    "detects every same-class substitution in $electronic",
    ({ electronic }) => {
      for (let i = 0; i < electronic.length; i++) {
        const original = electronic.charAt(i);
        const replacements = DIGITS.includes(original) ? DIGITS : LETTERS;
        for (const replacement of replacements) {
          if (replacement === original) continue;
          const altered = electronic.slice(0, i) + replacement + electronic.slice(i + 1);
          expect(isValidIBAN(altered), altered).toBe(false);
        }
      }
    },
  );

  it.each(DOCUMENTED_VALID_IBANS)(
    "detects every adjacent transposition of two different digits in $electronic",
    ({ electronic }) => {
      for (let i = 0; i < electronic.length - 1; i++) {
        const [a, b] = [electronic.charAt(i), electronic.charAt(i + 1)];
        if (a === b || !DIGITS.includes(a) || !DIGITS.includes(b)) continue;
        const swapped = electronic.slice(0, i) + b + a + electronic.slice(i + 2);
        expect(isValidIBAN(swapped), swapped).toBe(false);
      }
    },
  );

  it("detects a deleted or inserted character", () => {
    for (let i = 0; i < IT.length; i++) {
      expect(isValidIBAN(IT.slice(0, i) + IT.slice(i + 1))).toBe(false);
      expect(isValidIBAN(IT.slice(0, i) + "7" + IT.slice(i))).toBe(false);
    }
  });
});

describe("validateIBAN: edge cases", () => {
  it("accepts IBANs containing tabs and newlines between groups", () => {
    expect(validateIBAN("IT60\tX054\t2811\t1010\t0000\t0123\t456").valid).toBe(true);
    expect(validateIBAN("IT60 X054 2811\n1010 0000 0123 456\n").valid).toBe(true);
    expect(validateIBAN("IT60 X054 2811\r\n1010 0000 0123 456").valid).toBe(true);
  });

  it("rejects very long strings quickly and without throwing", () => {
    const long = `IT60${"0".repeat(1_000_000)}`;
    const started = Date.now();
    expect(validateIBAN(long)).toMatchObject({
      valid: false,
      error: "INVALID_LENGTH",
      length: 1_000_004,
    });
    expect(validateIBAN("A".repeat(1_000_000))).toMatchObject({ error: "INVALID_FORMAT" });
    expect(validateIBAN("💶".repeat(100_000))).toMatchObject({ error: "INVALID_CHARACTERS" });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("checksumValid agrees with an independent BigInt implementation", () => {
    const random = createRandom(7064);
    for (let i = 0; i < 500; i++) {
      const country = COUNTRIES[Math.floor(random() * COUNTRIES.length)];
      if (!country) throw new Error("unreachable");
      const candidate = `${country.countryCode}${randomBBAN("2!n", random)}${randomBBAN(country.bbanStructure, random)}`;
      const expected = referenceMod97(candidate.slice(4) + candidate.slice(0, 4)) === 1;
      expect(validateIBAN(candidate).checksumValid).toBe(expected);
    }
  });
});

describe("isValidIBAN", () => {
  it("agrees with validateIBAN", () => {
    const inputs = [
      ...DOCUMENTED_VALID_IBANS.map((v) => v.print),
      "",
      "IT",
      "IT61X0542811101000000123456",
      "XX60X0542811101000000123456",
      "IT60-X054",
    ];
    for (const input of inputs) expect(isValidIBAN(input)).toBe(validateIBAN(input).valid);
  });

  it("returns true for a valid IBAN with spaces and lowercase letters", () => {
    expect(isValidIBAN("de89 3704 0044 0532 0130 00")).toBe(true);
  });
});
