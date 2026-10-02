import { describe, expect, it } from "vitest";
import { COUNTRIES } from "../src/countries.js";
import { isValidChecksum, mod97 } from "../src/mod97.js";
import { createRandom, referenceMod97, WIKIPEDIA_WORKED_EXAMPLE } from "./fixtures.js";

describe("mod97", () => {
  it("maps letters to two digits (A = 10 ... Z = 35)", () => {
    expect(mod97("A")).toBe(10);
    expect(mod97("Z")).toBe(35);
    expect(mod97("A")).toBe(mod97("10"));
    expect(mod97("Z1")).toBe(mod97("351"));
  });

  it("returns 0 for the empty string and handles leading zeros", () => {
    expect(mod97("")).toBe(0);
    expect(mod97("0000097")).toBe(0);
    expect(mod97("0000098")).toBe(1);
  });

  it("reproduces the Wikipedia worked example", () => {
    const { iban, numeric } = WIKIPEDIA_WORKED_EXAMPLE;
    expect(mod97(numeric)).toBe(1);
    expect(mod97(iban.slice(4) + iban.slice(0, 4))).toBe(1);
  });

  it("matches a BigInt reference implementation on random alphanumeric strings", () => {
    const random = createRandom(97);
    const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < 2000; i++) {
      const length = 1 + Math.floor(random() * 80);
      let value = "";
      for (let j = 0; j < length; j++) value += alphabet.charAt(Math.floor(random() * 36));
      expect(mod97(value)).toBe(referenceMod97(value));
    }
  });

  it("handles the largest possible IBAN value (34 characters of Z)", () => {
    const value = "Z".repeat(34);
    expect(mod97(value)).toBe(referenceMod97(value));
  });

  it("handles inputs far longer than any IBAN", () => {
    const value = "9Z".repeat(5000);
    expect(mod97(value)).toBe(referenceMod97(value));
  });
});

describe("mod97 does not depend on Number precision", () => {
  const { numeric } = WIKIPEDIA_WORKED_EXAMPLE;

  it("works on values beyond Number.MAX_SAFE_INTEGER", () => {
    expect(BigInt(numeric) > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(Number.isSafeInteger(Number(numeric))).toBe(false);
    expect(mod97(numeric)).toBe(Number(BigInt(numeric) % 97n));
  });

  it("gives the correct answer where a naive Number conversion does not", () => {
    // Number(numeric) is rounded to the nearest double, so its remainder is wrong.
    expect(Number(numeric) % 97).not.toBe(1);
    expect(mod97(numeric)).toBe(1);
  });

  it("is correct on every registry example, whose numeric form exceeds 2^53", () => {
    for (const { example } of COUNTRIES) {
      const rearranged = example.slice(4) + example.slice(0, 4);
      expect(referenceMod97(rearranged)).toBe(1);
      expect(mod97(rearranged)).toBe(1);
    }
  });
});

describe("isValidChecksum", () => {
  it("accepts every registry example", () => {
    for (const { example } of COUNTRIES) expect(isValidChecksum(example)).toBe(true);
  });

  it("rejects every registry example with altered check digits", () => {
    for (const { example } of COUNTRIES) {
      const checkDigits = Number(example.slice(2, 4));
      const altered = String((checkDigits + 1) % 100).padStart(2, "0");
      expect(isValidChecksum(example.slice(0, 2) + altered + example.slice(4))).toBe(false);
    }
  });
});
