import { describe, expect, it } from "vitest";
import { normalizeIBAN } from "../src/index.js";

const NORMALIZED = "IT60X0542811101000000123456";

describe("normalizeIBAN", () => {
  it("converts the print format to the electronic format", () => {
    expect(normalizeIBAN("it60 x054 2811 1010 0000 0123 456")).toBe(NORMALIZED);
  });

  it.each([
    ["lowercase", "it60x0542811101000000123456"],
    ["uppercase", "IT60X0542811101000000123456"],
    ["mixed case", "It60x0542811101000000123456"],
    ["spaces", "IT60 X054 2811 1010 0000 0123 456"],
    ["irregular spaces", "IT 60X05 428111 0100 00001 23456"],
    ["leading and trailing whitespace", "  \t IT60X0542811101000000123456 \n "],
    ["tabs", "IT60\tX054\t2811\t1010\t0000\t0123\t456"],
    ["newlines", "IT60X054\n2811101000\r\n000123456"],
    ["non-breaking spaces", "IT60 X054 2811 1010 0000 0123 456"],
  ])("handles %s", (_label, input) => {
    expect(normalizeIBAN(input)).toBe(NORMALIZED);
  });

  it("leaves an already normalized IBAN unchanged and is idempotent", () => {
    expect(normalizeIBAN(NORMALIZED)).toBe(NORMALIZED);
    const once = normalizeIBAN(" de89 3704 0044 0532 0130 00 ");
    expect(normalizeIBAN(once)).toBe(once);
  });

  it("returns an empty string for empty or whitespace-only input", () => {
    expect(normalizeIBAN("")).toBe("");
    expect(normalizeIBAN(" \t\r\n ")).toBe("");
  });

  it("does not remove separators other than whitespace", () => {
    expect(normalizeIBAN("IT60-X054-2811")).toBe("IT60-X054-2811");
    expect(normalizeIBAN("it60.x054")).toBe("IT60.X054");
  });

  it("does not case-map non-ASCII characters into ASCII letters", () => {
    // "ı".toUpperCase() === "I" and "ß".toUpperCase() === "SS" in JavaScript.
    expect(normalizeIBAN("ıt60")).toBe("ıT60");
    expect(normalizeIBAN("ßt60")).toBe("ßT60");
    expect(normalizeIBAN("é")).toBe("é");
  });

  it("does not convert non-ASCII digits", () => {
    expect(normalizeIBAN("IT６０")).toBe("IT６０");
    expect(normalizeIBAN("IT٦٠")).toBe("IT٦٠");
  });

  it("keeps zero-width characters, which are not whitespace", () => {
    expect(normalizeIBAN("IT60​X054")).toBe("IT60​X054");
  });

  it("throws a TypeError for non-string input", () => {
    expect(() => normalizeIBAN(null as unknown as string)).toThrow(TypeError);
    expect(() => normalizeIBAN(undefined as unknown as string)).toThrow(
      "Expected a string, received undefined",
    );
    expect(() => normalizeIBAN(123 as unknown as string)).toThrow(
      "Expected a string, received number",
    );
    expect(() => normalizeIBAN(null as unknown as string)).toThrow(
      "Expected a string, received null",
    );
  });
});
