#!/usr/bin/env node
/**
 * Smoke test of the built package (run `npm run build` first).
 * Imports the package by name, through the "exports" map, as both ESM and CommonJS.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as esm from "iban-check";

const cjs = createRequire(import.meta.url)("iban-check");

const API = [
  "getCountryInfo",
  "getSupportedCountries",
  "isValidIBAN",
  "normalizeIBAN",
  "parseIBAN",
  "validateIBAN",
];

for (const [format, mod] of [
  ["esm", esm],
  ["cjs", cjs],
]) {
  assert.deepEqual(Object.keys(mod).sort(), API, `${format}: exported API`);
  assert.equal(mod.validateIBAN("IT60X0542811101000000123456").valid, true, `${format}: IT`);
  assert.equal(mod.isValidIBAN("de89 3704 0044 0532 0130 00"), true, `${format}: DE`);
  assert.equal(mod.validateIBAN("IT61X0542811101000000123456").error, "INVALID_CHECKSUM");
  assert.equal(mod.normalizeIBAN(" fr14 2004 "), "FR142004", `${format}: normalize`);
  assert.equal(mod.parseIBAN("GB29NWBK60161331926819").bankIdentifier, "NWBK");
  assert.equal(mod.getCountryInfo("pl")?.ibanLength, 28, `${format}: country info`);
  assert.equal(mod.getSupportedCountries().length, 89, `${format}: countries`);
}

console.log(`Smoke test passed on Node.js ${process.version} (ESM + CommonJS).`);
