import { describe, expect, it } from "vitest";
import { COUNTRIES } from "../src/countries.js";
import { isValidIBAN, parseIBAN } from "../src/index.js";
import { DOCUMENTED_VALID_IBANS } from "./fixtures.js";

describe("parseIBAN", () => {
  it("parses an Italian IBAN (SWIFT registry example)", () => {
    expect(parseIBAN("IT60X0542811101000000123456")).toEqual({
      iban: "IT60X0542811101000000123456",
      normalized: "IT60X0542811101000000123456",
      valid: true,
      error: null,
      countryCode: "IT",
      countryName: "Italy",
      checkDigits: "60",
      bban: "X0542811101000000123456",
      length: 27,
      bankIdentifier: "05428",
      branchIdentifier: "11101",
      sepa: true,
    });
  });

  it("parses the print format and keeps the original input", () => {
    const details = parseIBAN("gb29 nwbk 6016 1331 9268 19");
    expect(details).toMatchObject({
      iban: "gb29 nwbk 6016 1331 9268 19",
      normalized: "GB29NWBK60161331926819",
      valid: true,
      countryCode: "GB",
      checkDigits: "29",
      bban: "NWBK60161331926819",
      bankIdentifier: "NWBK",
      branchIdentifier: "601613",
    });
  });

  it("returns null for a branch identifier the registry does not define", () => {
    expect(parseIBAN("DE89370400440532013000")).toMatchObject({
      bankIdentifier: "37040044",
      branchIdentifier: null,
    });
  });

  it("extracts identifiers at the registry position for every country example", () => {
    for (const country of COUNTRIES) {
      const details = parseIBAN(country.example);
      const bban = country.example.slice(4);
      const bank = country.bankIdentifierPosition;
      const branch = country.branchIdentifierPosition;
      expect(details.valid).toBe(true);
      expect(details.countryCode).toBe(country.countryCode);
      expect(details.countryName).toBe(country.countryName);
      expect(details.sepa).toBe(country.sepa);
      expect(details.bban).toBe(bban);
      expect(details.bankIdentifier).toBe(bank ? bban.slice(bank.start, bank.end) : null);
      expect(details.branchIdentifier).toBe(branch ? bban.slice(branch.start, branch.end) : null);
    }
  });

  it("agrees with isValidIBAN on documented vectors", () => {
    for (const { print } of DOCUMENTED_VALID_IBANS) {
      expect(parseIBAN(print).valid).toBe(isValidIBAN(print));
    }
  });

  it("only returns information encoded in the IBAN, never institution names", () => {
    expect(Object.keys(parseIBAN("IT60X0542811101000000123456")).sort()).toEqual([
      "bankIdentifier",
      "bban",
      "branchIdentifier",
      "checkDigits",
      "countryCode",
      "countryName",
      "error",
      "iban",
      "length",
      "normalized",
      "sepa",
      "valid",
    ]);
  });
});

describe("parseIBAN with invalid input", () => {
  it("still splits an IBAN with a wrong checksum", () => {
    expect(parseIBAN("IT61X0542811101000000123456")).toMatchObject({
      valid: false,
      error: "INVALID_CHECKSUM",
      countryCode: "IT",
      checkDigits: "61",
      bban: "X0542811101000000123456",
      bankIdentifier: "05428",
      branchIdentifier: "11101",
    });
  });

  it("does not extract identifiers when the length is wrong", () => {
    expect(parseIBAN("IT60X05428111010000001234")).toMatchObject({
      valid: false,
      error: "INVALID_LENGTH",
      countryCode: "IT",
      countryName: "Italy",
      bban: "X05428111010000001234",
      length: 25,
      bankIdentifier: null,
      branchIdentifier: null,
    });
  });

  it("returns the raw parts for an unknown country", () => {
    expect(parseIBAN("XX60X0542811101000000123456")).toMatchObject({
      valid: false,
      error: "INVALID_COUNTRY",
      countryCode: "XX",
      countryName: null,
      checkDigits: "60",
      bban: "X0542811101000000123456",
      bankIdentifier: null,
      branchIdentifier: null,
      sepa: null,
    });
  });

  it.each([
    ["", "EMPTY_INPUT"],
    ["IT60-X054", "INVALID_CHARACTERS"],
    ["IT", "INVALID_FORMAT"],
  ] as const)("returns null parts for %j", (input, error) => {
    expect(parseIBAN(input)).toMatchObject({
      valid: false,
      error,
      countryCode: null,
      checkDigits: null,
      bban: null,
      bankIdentifier: null,
      branchIdentifier: null,
    });
  });

  it("does not throw on non-string input", () => {
    expect(parseIBAN(undefined as unknown as string)).toEqual({
      iban: "",
      normalized: "",
      valid: false,
      error: "INVALID_INPUT",
      countryCode: null,
      countryName: null,
      checkDigits: null,
      bban: null,
      length: 0,
      bankIdentifier: null,
      branchIdentifier: null,
      sepa: null,
    });
  });
});
