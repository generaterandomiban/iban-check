import { describe, expect, it } from "vitest";
import { COUNTRIES } from "../src/countries.js";
import { getCountryInfo, getSupportedCountries } from "../src/index.js";

function structureLength(structure: string): number {
  let total = 0;
  for (const [, count] of structure.matchAll(/(\d+)!([nac])/g)) total += Number(count);
  return total;
}

describe("country data (SWIFT IBAN Registry)", () => {
  it("contains 89 countries with unique codes, sorted by code", () => {
    const codes = COUNTRIES.map((c) => c.countryCode);
    expect(codes).toHaveLength(89);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toEqual([...codes].sort());
  });

  it("includes the countries listed in the README examples", () => {
    for (const code of ["IT", "DE", "FR", "ES", "NL", "BE", "AT", "PT", "IE", "GB", "CH", "PL"]) {
      expect(getCountryInfo(code), code).not.toBeNull();
    }
  });

  it.each(COUNTRIES.map((c) => [c.countryCode, c] as const))(
    "%s is internally consistent",
    (code, c) => {
      expect(code).toMatch(/^[A-Z]{2}$/);
      expect(c.countryName.length).toBeGreaterThan(0);
      expect(c.bbanStructure).toMatch(/^(\d+![nac])+$/);
      expect(structureLength(c.bbanStructure)).toBe(c.bbanLength);
      expect(c.ibanLength).toBe(c.bbanLength + 4);
      expect(c.ibanLength).toBeLessThanOrEqual(34);
      expect(c.example).toHaveLength(c.ibanLength);
      expect(c.example.startsWith(code)).toBe(true);
      for (const position of [c.bankIdentifierPosition, c.branchIdentifierPosition]) {
        if (!position) continue;
        expect(position.start).toBeGreaterThanOrEqual(0);
        expect(position.end).toBeGreaterThan(position.start);
        expect(position.end).toBeLessThanOrEqual(c.bbanLength);
      }
    },
  );
});

describe("getCountryInfo", () => {
  it("returns the registry data for Italy", () => {
    expect(getCountryInfo("IT")).toEqual({
      countryCode: "IT",
      countryName: "Italy",
      ibanLength: 27,
      bbanLength: 23,
      bbanStructure: "1!a5!n5!n12!c",
      sepa: true,
      bankIdentifierPosition: { start: 1, end: 6 },
      branchIdentifierPosition: { start: 6, end: 11 },
      example: "IT60X0542811101000000123456",
    });
  });

  it.each([
    ["DE", 22],
    ["FR", 27],
    ["ES", 24],
    ["NL", 18],
    ["BE", 16],
    ["AT", 20],
    ["PT", 25],
    ["IE", 22],
    ["GB", 22],
    ["CH", 21],
    ["PL", 28],
    ["NO", 15],
    ["RU", 33],
  ])("%s has IBAN length %i", (code, length) => {
    expect(getCountryInfo(code)?.ibanLength).toBe(length);
  });

  it("is case-insensitive and ignores surrounding whitespace", () => {
    expect(getCountryInfo("it")?.countryCode).toBe("IT");
    expect(getCountryInfo(" De ")?.countryCode).toBe("DE");
  });

  it.each(["", "XX", "US", "ITA", "I", "1T", "ıt"])("returns null for %j", (code) => {
    expect(getCountryInfo(code)).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(getCountryInfo(null as unknown as string)).toBeNull();
    expect(getCountryInfo(39 as unknown as string)).toBeNull();
  });

  it("returns a copy that cannot corrupt the registry data", () => {
    const info = getCountryInfo("IT") as {
      ibanLength: number;
      bankIdentifierPosition: { start: number };
    };
    info.ibanLength = 1;
    info.bankIdentifierPosition.start = 99;
    expect(getCountryInfo("IT")).toMatchObject({
      ibanLength: 27,
      bankIdentifierPosition: { start: 1 },
    });
  });
});

describe("getSupportedCountries", () => {
  it("returns every registry country as a copy", () => {
    const countries = getSupportedCountries();
    expect(countries).toEqual(COUNTRIES);
    expect(countries[0]).not.toBe(COUNTRIES[0]);
  });
});
