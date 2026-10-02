# Contributing to iban-check

Thanks for helping. Bug reports, data corrections, documentation fixes and code are all welcome.

Please follow the [Code of Conduct](./CODE_OF_CONDUCT.md). Report security vulnerabilities as described in [SECURITY.md](./SECURITY.md), not in public issues.

## Project goals

Changes should fit these goals:

- Every country rule comes from the SWIFT IBAN Registry, with no guessed values.
- The package has no runtime dependencies and stays small.
- The API stays small and stable. A new public function needs a clear use case.
- The code runs locally, with no network access, telemetry or external services.

## Getting started

You need npm and Node.js 20.19 or later. The development tools require it, even though the published package runs on Node.js 18+.

```bash
git clone https://github.com/generaterandomiban/iban-check.git
cd iban-check
npm install
```

## Development workflow

```bash
npm test               # run the test suite once
npm run test:watch     # re-run tests on change
npm run test:coverage  # tests + coverage report (100% threshold)
npm run lint           # ESLint + TypeScript type check + Prettier check
npm run format         # auto-format with Prettier
npm run build          # build dist/ (ESM, CommonJS, .d.ts) with tsup
npm run test:dist      # smoke-test the built package via import and require
npm run check:package  # validate exports/types with publint and arethetypeswrong
```

Before opening a pull request, make sure this passes:

```bash
npm run lint && npm test && npm run build && npm run test:dist
```

### Project layout

```text
src/
  index.ts          public exports
  validate.ts       validateIBAN, isValidIBAN and the shared validation steps
  normalize.ts      normalizeIBAN
  parser.ts         parseIBAN
  mod97.ts          ISO 7064 MOD 97-10
  country-info.ts   getCountryInfo, getSupportedCountries, BBAN structure matching
  countries.ts      GENERATED country data, do not edit by hand
  types.ts          public types
tests/              Vitest test suites and documented test vectors (fixtures.ts)
scripts/            data generator and dist smoke test
```

## Adding or changing country data

`src/countries.ts` is generated from the official SWIFT IBAN Registry. Don't edit it by hand.

1. Download the latest registry in TXT format from
   https://www.swift.com/standards/data-standards/iban-international-bank-account-number
2. Regenerate the data:

   ```bash
   npm run generate:countries -- /path/to/iban-registry.txt YYYY-MM-DD
   ```

   The script checks that each structure matches its declared length and that each example IBAN matches its structure and passes MOD-97. If any check fails, it writes nothing.

3. Review the diff and run `npm test`.
4. Update [COUNTRY_DATA_SOURCES.md](./COUNTRY_DATA_SOURCES.md) (retrieval date, SHA-256, country count), the country table in `README.md` and [CHANGELOG.md](./CHANGELOG.md).
5. In the pull request, say which registry release or download date you used.

Do not commit the raw registry file. It contains personal contact details of the national registrars, and `.gitignore` excludes `*registry*.txt`.

If you think the registry itself is wrong, open an issue with a link to an official source, such as a publication of the national central bank. The data is only changed locally when an official reference supports the change.

## Adding tests

Tests live in `tests/` and use [Vitest](https://vitest.dev/).

- Test the public API through `src/index.ts` where possible.
- Don't invent an IBAN and call it valid. A valid IBAN in a test must be one of these:
  1. a documented example from an authoritative source, added to `DOCUMENTED_VALID_IBANS` in `tests/fixtures.ts` with its `source`;
  2. a registry example (`COUNTRIES[n].example`);
  3. a synthetic IBAN built with `withCheckDigits()`, which computes the check digits with a separate `BigInt` implementation. Label it as synthetic in the test.
- Invalid IBANs can be derived from valid ones, for example by changing one character.
- Coverage must stay at 100% (`npm run test:coverage`).

## Pull request workflow

1. Open an issue first for larger changes or API changes, so we can agree on the approach.
2. Fork the repository and create a branch from `main`, e.g. `fix/normalize-nbsp` or `data/registry-2026-q3`.
3. Make your change with tests and documentation (`README.md`, JSDoc comments).
4. Add an entry under "Unreleased" in [CHANGELOG.md](./CHANGELOG.md) if the change affects users.
5. Run `npm run lint && npm test && npm run build && npm run test:dist`.
6. Open the pull request and describe what changed and why. CI must pass.
7. A maintainer will review it.

Commit messages should be short and in the imperative mood ("Add …", "Fix …").

## Releasing (maintainers)

1. Update the version in `package.json` (`npm version patch|minor|major --no-git-tag-version`) and move the "Unreleased" entries in `CHANGELOG.md` under the new version.
2. Run `npm pack --dry-run` and `npm publish --dry-run`, and check the file list.
3. Commit, tag (`git tag vX.Y.Z`), push, then `npm publish`.
