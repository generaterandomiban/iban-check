#!/usr/bin/env node
/**
 * Regenerates src/countries.ts from the official SWIFT IBAN Registry (TXT edition).
 *
 * Usage:
 *   node scripts/generate-countries.mjs <path-to-swift-iban-registry.txt> [retrieved-date]
 *
 * The registry file is not committed to this repository (it contains personal contact
 * details of the national registrars). See COUNTRY_DATA_SOURCES.md for where to get it.
 *
 * The script refuses to write anything if the registry data is internally inconsistent
 * (structure vs. declared length, example IBAN failing MOD-97, ...).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [, , registryPath, retrievedArg] = process.argv;

if (!registryPath) {
  console.error("Usage: node scripts/generate-countries.mjs <registry.txt> [YYYY-MM-DD]");
  process.exit(1);
}

const raw = readFileSync(registryPath);
const sha256 = createHash("sha256").update(raw).digest("hex");
const retrieved = retrievedArg ?? new Date().toISOString().slice(0, 10);

// The SWIFT TXT file is Windows-1252 encoded, tab separated and transposed:
// each line is a data element, each column (after the first) is a country.
const lines = new TextDecoder("windows-1252").decode(raw).split(/\r?\n/);

function row(label) {
  const line = lines.find((l) => l.split("\t")[0].trim() === label);
  if (!line) throw new Error(`Registry row not found: "${label}"`);
  return line
    .split("\t")
    .slice(1)
    .map((cell) => cell.replace(/^"|"$/g, "").trim());
}

const names = row("Name of country");
const codes = row("IBAN prefix country code (ISO 3166)");
const sepa = row("SEPA country");
const bbanStructures = row("BBAN structure");
const bbanLengths = row("BBAN length");
const bankPositions = row("Bank identifier position within the BBAN");
const branchPositions = row("Branch identifier position within the BBAN");
const ibanLengths = row("IBAN length");
const examples = row("IBAN electronic format example");

const STRUCTURE_TOKEN = /(\d+)!([nac])/g;
const CHARSET = { n: "[0-9]", a: "[A-Z]", c: "[A-Z0-9]" };

function structureLength(structure) {
  let total = 0;
  for (const [, count] of structure.matchAll(STRUCTURE_TOKEN)) total += Number(count);
  return total;
}

function structureRegExp(structure) {
  let source = "";
  for (const [, count, type] of structure.matchAll(STRUCTURE_TOKEN)) {
    source += `${CHARSET[type]}{${count}}`;
  }
  return new RegExp(`^${source}$`);
}

function mod97(iban) {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const value = Number.parseInt(char, 36);
    remainder = (remainder * (value > 9 ? 100 : 10) + value) % 97;
  }
  return remainder;
}

/** "2-6" (1-based, inclusive) -> { start: 1, end: 6 } (0-based, end exclusive) */
function position(value) {
  if (!value || value === "N/A") return null;
  const match = /^(\d+)-(\d+)$/.exec(value);
  if (!match) throw new Error(`Unexpected position format: "${value}"`);
  return { start: Number(match[1]) - 1, end: Number(match[2]) };
}

const countries = [];

for (let i = 0; i < codes.length; i++) {
  const code = codes[i];
  if (!code) continue;
  const bbanStructure = bbanStructures[i];
  const ibanLength = Number(ibanLengths[i]);
  const bbanLength = Number(bbanLengths[i]);
  const example = examples[i].replace(/\s/g, "");
  const errors = [];

  if (!/^[A-Z]{2}$/.test(code)) errors.push("invalid country code");
  if (structureLength(bbanStructure) !== bbanLength) errors.push("BBAN structure/length mismatch");
  if (ibanLength !== bbanLength + 4) errors.push("IBAN length is not BBAN length + 4");
  if (example.length !== ibanLength) errors.push("example length mismatch");
  if (!example.startsWith(code) || !/^[0-9]{2}$/.test(example.slice(2, 4))) {
    errors.push("example prefix mismatch");
  }
  if (!structureRegExp(bbanStructure).test(example.slice(4)))
    errors.push("example BBAN structure mismatch");
  if (mod97(example) !== 1) errors.push("example fails MOD-97");
  if (errors.length > 0) throw new Error(`${code}: ${errors.join(", ")}`);

  countries.push({
    countryCode: code,
    countryName: names[i],
    ibanLength,
    bbanLength,
    bbanStructure,
    sepa: sepa[i] === "Yes",
    bankIdentifierPosition: position(bankPositions[i]),
    branchIdentifierPosition: position(branchPositions[i]),
    example,
  });
}

countries.sort((a, b) => a.countryCode.localeCompare(b.countryCode));

const formatPosition = (p) => (p ? `{ start: ${p.start}, end: ${p.end} }` : "null");

const body = countries
  .map(
    (c) => `  {
    countryCode: ${JSON.stringify(c.countryCode)},
    countryName: ${JSON.stringify(c.countryName)},
    ibanLength: ${c.ibanLength},
    bbanLength: ${c.bbanLength},
    bbanStructure: ${JSON.stringify(c.bbanStructure)},
    sepa: ${c.sepa},
    bankIdentifierPosition: ${formatPosition(c.bankIdentifierPosition)},
    branchIdentifierPosition: ${formatPosition(c.branchIdentifierPosition)},
    example: ${JSON.stringify(c.example)},
  },`,
  )
  .join("\n");

const output = `/**
 * IBAN country data.
 *
 * GENERATED FILE - do not edit by hand. Run \`node scripts/generate-countries.mjs\`.
 *
 * Source: SWIFT IBAN Registry (ISO 13616), TXT edition.
 * Retrieved: ${retrieved}
 * SHA-256 of source file: ${sha256}
 *
 * See COUNTRY_DATA_SOURCES.md for details.
 */
import type { CountryInfo } from "./types.js";

export const COUNTRIES: readonly CountryInfo[] = [
${body}
];
`;

const target = resolve(dirname(fileURLToPath(import.meta.url)), "../src/countries.ts");
writeFileSync(target, output);
console.log(`Wrote ${countries.length} countries to ${target}`);
