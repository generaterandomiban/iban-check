# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 0.1.0

Initial release.

- `validateIBAN()` with detailed results and error codes: `INVALID_INPUT`, `EMPTY_INPUT`, `INVALID_CHARACTERS`, `INVALID_FORMAT`, `INVALID_COUNTRY`, `INVALID_LENGTH`, `INVALID_BBAN_FORMAT`, `INVALID_CHECKSUM`.
- `isValidIBAN()`, `normalizeIBAN()`, `parseIBAN()`, `getCountryInfo()` and `getSupportedCountries()`.
- Precise ISO 7064 MOD 97-10 checksum, without `Number` precision loss and without `BigInt`.
- Country data for 89 countries generated from the SWIFT IBAN Registry (see `COUNTRY_DATA_SOURCES.md`).
- ESM and CommonJS builds with TypeScript declarations. Zero runtime dependencies.
