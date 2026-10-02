# iban-check

Fast, zero-dependency IBAN validation and parsing for JavaScript and TypeScript, based on the official SWIFT IBAN Registry.

[![CI](https://github.com/generaterandomiban/iban-check/actions/workflows/ci.yml/badge.svg)](https://github.com/generaterandomiban/iban-check/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/iban-check.svg)](https://www.npmjs.com/package/iban-check)
[![license](https://img.shields.io/npm/l/iban-check.svg)](./LICENSE)

```ts
import { validateIBAN } from "iban-check";

validateIBAN("IT60 X054 2811 1010 0000 0123 456").valid; // true
validateIBAN("IT61 X054 2811 1010 0000 0123 456").error; // "INVALID_CHECKSUM"
```

## Features

- Checks the character set, country code, country-specific length, BBAN structure and ISO 7064 MOD 97-10 checksum.
- Says why an IBAN is invalid, with a machine-readable error code and a message in English.
- Extracts the country code, check digits, BBAN, and the bank and branch identifier codes at the positions the registry defines.
- Covers the 89 countries of the [SWIFT IBAN Registry](https://www.swift.com/standards/data-standards/iban-international-bank-account-number). [COUNTRY_DATA_SOURCES.md](./COUNTRY_DATA_SOURCES.md) lists the source and the consistency checks.
- Computes MOD-97 one character at a time, so 30-digit numbers keep full precision without `BigInt`.
- Has no runtime dependencies and takes about 4.7 kB minified and gzipped. Unused functions are tree-shaken: `normalizeIBAN` on its own bundles to a few hundred bytes.
- Ships ESM and CommonJS builds for Node.js 18+, modern browsers and bundlers.
- Includes strict TypeScript types, so you don't need an `@types` package.
- Runs locally and makes no network requests.

## Installation

```bash
npm install iban-check
```

```bash
pnpm add iban-check
yarn add iban-check
```

## Quick start

```ts
import { validateIBAN } from "iban-check";

const result = validateIBAN("IT60X0542811101000000123456");

if (result.valid) {
  console.log("Valid IBAN");
} else {
  console.log(`Invalid IBAN: ${result.error} - ${result.message}`);
}
```

CommonJS:

```js
const { validateIBAN } = require("iban-check");
```

## API

| Function                      | Returns              | Description                                                       |
| ----------------------------- | -------------------- | ----------------------------------------------------------------- |
| `validateIBAN(iban)`          | `ValidationResult`   | Validates and explains the result.                                |
| `isValidIBAN(iban)`           | `boolean`            | Shortcut for `validateIBAN(iban).valid`.                          |
| `normalizeIBAN(iban)`         | `string`             | Converts to the electronic format (no spaces, uppercase).         |
| `parseIBAN(iban)`             | `IBANDetails`        | Splits an IBAN into its parts.                                    |
| `getCountryInfo(countryCode)` | `CountryInfo / null` | IBAN format of a country, or `null` if it is not in the registry. |
| `getSupportedCountries()`     | `CountryInfo[]`      | All 89 registry countries, sorted by country code.                |

`validateIBAN`, `isValidIBAN`, `parseIBAN` and `getCountryInfo` never throw: they return an invalid result or `null` for anything that is not a valid input, including non-string values passed from JavaScript.

### `validateIBAN(iban: string): ValidationResult`

Accepts both the electronic format (`IT60X0542811101000000123456`) and the print format (`IT60 X054 2811 1010 0000 0123 456`), in any letter case.

Checks run in this order, and the first failure is reported:

| Error code            | Meaning                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `INVALID_INPUT`       | The input is not a string (only possible from untyped JavaScript).                          |
| `EMPTY_INPUT`         | The input is empty or contains only whitespace.                                             |
| `INVALID_CHARACTERS`  | Characters other than `A-Z`, `a-z`, `0-9` and whitespace (e.g. `-`, `.`, accented letters). |
| `INVALID_FORMAT`      | Does not start with a 2-letter country code, 2 check digits and a BBAN.                     |
| `INVALID_COUNTRY`     | The country code is not in the IBAN registry (e.g. `US`).                                   |
| `INVALID_LENGTH`      | The length differs from the length defined for the country.                                 |
| `INVALID_BBAN_FORMAT` | The BBAN does not match the country structure (e.g. a letter in a German IBAN).             |
| `INVALID_CHECKSUM`    | The MOD-97 check failed.                                                                    |

The `IBANErrorCode` type contains all of these codes.

### `isValidIBAN(iban: string): boolean`

```ts
isValidIBAN("de89 3704 0044 0532 0130 00"); // true
isValidIBAN("DE89 3704 0044 0532 0130 01"); // false
```

### `normalizeIBAN(iban: string): string`

```ts
normalizeIBAN("it60 x054 2811 1010 0000 0123 456"); // "IT60X0542811101000000123456"
normalizeIBAN("IT60-X054"); // "IT60-X054" (not a valid IBAN, so it is left for validation to reject)
```

- Removes all whitespace: spaces, tabs, line breaks and non-breaking spaces (common when copying from PDFs or emails).
- Converts `a-z` to `A-Z`.
- Leaves everything else as it is, including dashes and dots, so malformed IBANs reach validation unchanged. Only ASCII letters change case, which keeps look-alikes such as the Turkish dotless `ı` from turning into `I`.
- Does not validate. Throws a `TypeError` if the argument is not a string.

### `parseIBAN(iban: string): IBANDetails`

```ts
parseIBAN("IT60X0542811101000000123456");
// {
//   iban: "IT60X0542811101000000123456",
//   normalized: "IT60X0542811101000000123456",
//   valid: true,
//   error: null,
//   countryCode: "IT",
//   countryName: "Italy",
//   checkDigits: "60",
//   bban: "X0542811101000000123456",
//   length: 27,
//   bankIdentifier: "05428",
//   branchIdentifier: "11101",
//   sepa: true
// }
```

Every field is read from the IBAN string or from the registry entry for its country:

- `countryCode`, `checkDigits` and `bban` are filled whenever the input has the basic `CC00…` shape, even if it is invalid, so a form can show partial feedback.
- `bankIdentifier` and `branchIdentifier` are the codes at the positions defined by the SWIFT registry, for example the ABI and CAB in Italy or the sort code in the UK. They are filled when the country is known and the length is correct, and are `null` when the registry defines no such field for the country.

Bank names, branch names, BIC codes and whether the account exists are not in an IBAN. Finding them needs an external bank directory, and iban-check does not guess them from prefixes.

### `getCountryInfo(countryCode: string): CountryInfo | null`

```ts
getCountryInfo("it");
// {
//   countryCode: "IT",
//   countryName: "Italy",
//   ibanLength: 27,
//   bbanLength: 23,
//   bbanStructure: "1!a5!n5!n12!c",
//   sepa: true,
//   bankIdentifierPosition: { start: 1, end: 6 },
//   branchIdentifierPosition: { start: 6, end: 11 },
//   example: "IT60X0542811101000000123456"
// }
```

- `bbanStructure` uses the SWIFT notation: `n` = digits, `a` = uppercase letters, `c` = letters or digits; `5!n` = exactly 5 digits.
- Positions are zero-based offsets within the BBAN, `end` exclusive: `bban.slice(start, end)`.
- `countryName` is copied verbatim from the registry (e.g. `"Netherlands (The)"`).
- `example` is the IBAN the registry publishes to illustrate the format. Don't send money to it.

### `getSupportedCountries(): CountryInfo[]`

Returns the `getCountryInfo` object of every country, for example to fill a country selector or to show the expected length while the user types.

## Validation result

`ValidationResult` is a discriminated union on `valid`, so TypeScript narrows it for you.

Valid IBAN:

```ts
validateIBAN("IT60X0542811101000000123456");
// {
//   valid: true,
//   iban: "IT60X0542811101000000123456",
//   normalized: "IT60X0542811101000000123456",
//   country: "IT",
//   countryName: "Italy",
//   length: 27,
//   expectedLength: 27,
//   checksumValid: true
// }
```

Invalid IBAN:

```ts
validateIBAN("IT60X05428111010000001234");
// {
//   valid: false,
//   iban: "IT60X05428111010000001234",
//   normalized: "IT60X05428111010000001234",
//   country: "IT",
//   countryName: "Italy",
//   length: 25,
//   expectedLength: 27,
//   checksumValid: false,
//   error: "INVALID_LENGTH",
//   message: "The IBAN length does not match the length defined for its country."
// }
```

| Field            | Description                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `valid`          | `true` only if every check passes.                                                                     |
| `iban`           | The input exactly as received.                                                                         |
| `normalized`     | The input after `normalizeIBAN()`.                                                                     |
| `country`        | Country code if it is in the registry, else `null`.                                                    |
| `countryName`    | Registry country name, else `null`.                                                                    |
| `length`         | Length of `normalized`.                                                                                |
| `expectedLength` | IBAN length for the country, else `null`.                                                              |
| `checksumValid`  | Whether MOD-97 passes. Computed whenever the basic format is valid, even if another check failed.      |
| `error`          | Only when invalid: an `IBANErrorCode`.                                                                 |
| `message`        | Only when invalid: a human-readable explanation in English. For your own UI text, use `error` instead. |

## Supported countries

The 89 countries and territories of the SWIFT IBAN Registry, with names spelled as in the registry. According to the registry, some codes also cover other territories: `FR` includes the French overseas departments, and `GB` includes Jersey, Guernsey and the Isle of Man.

<details>
<summary>Show all 89 countries</summary>

| Code | Country                     | IBAN length | SEPA |
| ---- | --------------------------- | ----------- | ---- |
| AD   | Andorra                     | 24          | Yes  |
| AE   | United Arab Emirates (The)  | 23          | No   |
| AL   | Albania                     | 28          | No   |
| AT   | Austria                     | 20          | Yes  |
| AZ   | Azerbaijan                  | 28          | No   |
| BA   | Bosnia and Herzegovina      | 20          | No   |
| BE   | Belgium                     | 16          | Yes  |
| BG   | Bulgaria                    | 22          | Yes  |
| BH   | Bahrain                     | 22          | No   |
| BI   | Burundi                     | 27          | No   |
| BR   | Brazil                      | 29          | No   |
| BY   | Belarus                     | 28          | No   |
| CH   | Switzerland                 | 21          | Yes  |
| CR   | Costa Rica                  | 22          | No   |
| CY   | Cyprus                      | 28          | Yes  |
| CZ   | Czechia                     | 24          | Yes  |
| DE   | Germany                     | 22          | Yes  |
| DJ   | Djibouti                    | 27          | No   |
| DK   | Denmark                     | 18          | Yes  |
| DO   | Dominican Republic          | 28          | No   |
| EE   | Estonia                     | 20          | Yes  |
| EG   | Egypt                       | 29          | No   |
| ES   | Spain                       | 24          | Yes  |
| FI   | Finland                     | 18          | Yes  |
| FK   | Falkland Islands (Malvinas) | 18          | No   |
| FO   | Faroe Islands               | 18          | No   |
| FR   | France                      | 27          | Yes  |
| GB   | United Kingdom              | 22          | Yes  |
| GE   | Georgia                     | 22          | No   |
| GI   | Gibraltar                   | 23          | Yes  |
| GL   | Greenland                   | 18          | No   |
| GR   | Greece                      | 27          | Yes  |
| GT   | Guatemala                   | 28          | No   |
| HN   | Honduras                    | 28          | No   |
| HR   | Croatia                     | 21          | Yes  |
| HU   | Hungary                     | 28          | Yes  |
| IE   | Ireland                     | 22          | Yes  |
| IL   | Israel                      | 23          | No   |
| IQ   | Iraq                        | 23          | No   |
| IS   | Iceland                     | 26          | Yes  |
| IT   | Italy                       | 27          | Yes  |
| JO   | Jordan                      | 30          | No   |
| KW   | Kuwait                      | 30          | No   |
| KZ   | Kazakhstan                  | 20          | No   |
| LB   | Lebanon                     | 28          | No   |
| LC   | Saint Lucia                 | 32          | No   |
| LI   | Liechtenstein               | 21          | Yes  |
| LT   | Lithuania                   | 20          | Yes  |
| LU   | Luxembourg                  | 20          | Yes  |
| LV   | Latvia                      | 21          | Yes  |
| LY   | Libya                       | 25          | No   |
| MC   | Monaco                      | 27          | Yes  |
| MD   | Moldova, Republic of        | 24          | No   |
| ME   | Montenegro                  | 22          | No   |
| MK   | North Macedonia             | 19          | No   |
| MN   | Mongolia                    | 20          | No   |
| MR   | Mauritania                  | 27          | No   |
| MT   | Malta                       | 31          | Yes  |
| MU   | Mauritius                   | 30          | No   |
| NI   | Nicaragua                   | 28          | No   |
| NL   | Netherlands (The)           | 18          | Yes  |
| NO   | Norway                      | 15          | Yes  |
| OM   | Oman                        | 23          | No   |
| PK   | Pakistan                    | 24          | No   |
| PL   | Poland                      | 28          | Yes  |
| PS   | Palestine, State of         | 29          | No   |
| PT   | Portugal                    | 25          | Yes  |
| QA   | Qatar                       | 29          | No   |
| RO   | Romania                     | 24          | Yes  |
| RS   | Serbia                      | 22          | No   |
| RU   | Russian Federation          | 33          | No   |
| SA   | Saudi Arabia                | 24          | No   |
| SC   | Seychelles                  | 31          | No   |
| SD   | Sudan                       | 18          | No   |
| SE   | Sweden                      | 24          | Yes  |
| SI   | Slovenia                    | 19          | Yes  |
| SK   | Slovakia                    | 24          | Yes  |
| SM   | San Marino                  | 27          | Yes  |
| SO   | Somalia                     | 23          | No   |
| ST   | Sao Tome and Principe       | 25          | No   |
| SV   | El Salvador                 | 28          | No   |
| TL   | Timor-Leste                 | 23          | No   |
| TN   | Tunisia                     | 24          | No   |
| TR   | Turkiye                     | 26          | No   |
| UA   | Ukraine                     | 29          | No   |
| VA   | Holy See                    | 22          | Yes  |
| VG   | Virgin Islands (British)    | 24          | No   |
| XK   | Kosovo                      | 20          | No   |
| YE   | Yemen                       | 30          | No   |

</details>

[COUNTRY_DATA_SOURCES.md](./COUNTRY_DATA_SOURCES.md) records the source file, retrieval date and checksum, and explains how to update the data.

## Algorithm

IBANs are defined by ISO 13616, and their check digits use ISO 7064 MOD 97-10. iban-check validates an IBAN as follows:

1. Normalize: remove whitespace, convert to uppercase.
2. Check characters, format, country code, length and BBAN structure against the registry.
3. Move the first four characters (country code and check digits) to the end: `IT60X054…` → `X054…IT60`.
4. Replace each letter with two digits: `A = 10`, `B = 11`, …, `Z = 35`.
5. Compute the remainder of that number divided by 97. The IBAN is valid if the remainder is `1`.

The number from step 4 can have about 66 digits, and `Number.MAX_SAFE_INTEGER` has 16, so converting it with `Number()` gives wrong results. iban-check reads it one character at a time (`remainder = (remainder × 10 + digit) mod 97`). Intermediate values stay below 10,000, and the result is exact without `BigInt`. The tests compare it with a `BigInt` reference implementation.

### Limitations

A valid IBAN is well formed. That says nothing about whether the account exists or is open, and no IBAN validator catches every typo:

- MOD-97 catches every substitution of a digit with another digit or of a letter with another letter, and every swap of two adjacent digits. The tests check every such change on the documented example IBANs.
- If a digit is replaced by a letter, or a letter by a digit, at a position where the country allows both, the checksum can occasionally still match. Every validator has this gap because it comes from the IBAN standard. Where the registry requires only digits or only letters, the BBAN structure check catches the change.

Only your payment provider or bank can confirm that an account exists.

## Browser

iban-check has no dependencies and uses no Node.js APIs, so it works in any modern browser.

With a bundler (Vite, webpack, Rollup, esbuild, Next.js, ...):

```ts
import { isValidIBAN, normalizeIBAN } from "iban-check";

const input = document.querySelector<HTMLInputElement>("#iban")!;

input.addEventListener("input", () => {
  input.setCustomValidity(isValidIBAN(input.value) ? "" : "Please enter a valid IBAN");
});
```

Without a bundler, using a native ES module from a CDN:

```html
<script type="module">
  import { validateIBAN } from "https://cdn.jsdelivr.net/npm/iban-check@0.1.0/+esm";

  console.log(validateIBAN("NL91 ABNA 0417 1643 00").valid); // true
</script>
```

## TypeScript

Type definitions are included for both ESM (`index.d.ts`) and CommonJS (`index.d.cts`). They work with the `node10`, `node16`/`nodenext` and `bundler` module resolution modes.

```ts
import { validateIBAN, type IBANErrorCode, type ValidationResult } from "iban-check";

function errorText(code: IBANErrorCode): string {
  switch (code) {
    case "INVALID_CHECKSUM":
      return "Please check the IBAN for typos.";
    case "INVALID_LENGTH":
      return "The IBAN is too short or too long.";
    default:
      return "This is not a valid IBAN.";
  }
}

declare const userInput: string;

const result: ValidationResult = validateIBAN(userInput);

if (result.valid) {
  result.country; // string
} else {
  errorText(result.error); // `error` only exists on invalid results
}
```

Exported types: `ValidationResult`, `ValidIBANResult`, `InvalidIBANResult`, `IBANErrorCode`, `IBANDetails`, `CountryInfo` and `BBANPosition`.

## Privacy

IBANs are personal financial data. iban-check processes them locally, in your process or in the user's browser. It makes no HTTP or other network requests, sends nothing to any server, and contains no analytics, telemetry or tracking. It has no runtime dependencies and calls no external API.

The country data ships inside the package. To verify, search the source: it has no `fetch`, `XMLHttpRequest`, `http` or `https` calls.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and follow the [Code of Conduct](./CODE_OF_CONDUCT.md). To report a security vulnerability, see [SECURITY.md](./SECURITY.md) and do not open a public issue.

## Development

Requires Node.js 20.19+ for the development tooling. The published package itself runs on Node.js 18+.

```bash
npm install
npm test
npm run lint
npm run build
```

| Script                       | Description                                                             |
| ---------------------------- | ----------------------------------------------------------------------- |
| `npm test`                   | Runs the Vitest test suite.                                             |
| `npm run test:coverage`      | Tests with a coverage report (100% threshold).                          |
| `npm run lint`               | ESLint (strict, type-aware), `tsc --noEmit` and the Prettier check.     |
| `npm run format`             | Formats all files with Prettier.                                        |
| `npm run build`              | Builds ESM, CommonJS and type declarations into `dist/` with tsup.      |
| `npm run test:dist`          | Smoke-tests the built package via `import` and `require`.               |
| `npm run check:package`      | Validates `package.json` exports and types (publint, arethetypeswrong). |
| `npm run generate:countries` | Regenerates `src/countries.ts` from a SWIFT registry file.              |

## Publishing

```bash
# 1. Check everything
npm run lint
npm test
npm run build
npm run test:dist
npm run check:package

# 2. Inspect what will be published
npm pack --dry-run
npm publish --dry-run

# 3. Publish
npm login
npm publish
```

`prepublishOnly` runs lint, tests, build, the dist smoke test and publint again, so `npm publish` stops before uploading if any of them fails.

The package is not scoped. If you ever publish it under a scope (e.g. `@your-org/iban-check`), the first publish needs `npm publish --access public`.

## License

[MIT](./LICENSE)

---

iban-check is maintained by [GenerateRandomIBAN.com](https://generaterandomiban.com/), a free generator of valid test IBANs for 46 countries. It pairs well with this library when you need sample IBANs for forms and test suites.
