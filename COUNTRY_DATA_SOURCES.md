# Country data sources

The IBAN country data in [`src/countries.ts`](./src/countries.ts) and the test vectors come from the sources below. None of the data was invented or inferred.

## Primary source: SWIFT IBAN Registry

|                |                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Publisher      | SWIFT, the ISO-designated Registration Authority for ISO 13616 (IBAN)                                                                                       |
| Document       | IBAN Registry, TXT edition (the machine-readable version of the PDF registry)                                                                               |
| Official page  | https://www.swift.com/standards/data-standards/iban-international-bank-account-number                                                                       |
| File URL       | https://www.swift.com/swift-resource/11971/download                                                                                                         |
| Retrieved from | Internet Archive snapshot of the file URL, dated 2026-05-10: https://web.archive.org/web/20260510181723/https://www.swift.com/swift-resource/11971/download |
| Retrieved on   | 2026-10-02                                                                                                                                                  |
| File SHA-256   | `abb80e61a23c109da2100c06ebc5a6dc4782d25f564774ada3d963640991631e`                                                                                          |
| Countries      | 89                                                                                                                                                          |
| Latest entry   | The most recent per-country "Last update date" in the file is Dec-25 (December 2025)                                                                        |
| Last checked   | 2026-10-02                                                                                                                                                  |

swift.com rejected automated downloads (HTTP 403) at the time of retrieval, so the file was taken from the Internet Archive's copy of the official download URL. The TXT edition does not state its release number.

### Cross-check

The country list and the BBAN structures were compared with the data file of [python-stdnum](https://github.com/arthurdejong/python-stdnum) (`stdnum/iban.dat`), which says it was generated from `iban-registry-v101.txt` downloaded from swift.com. The 89 country codes and all 89 BBAN structures are identical.

### Fields used

For each country, `scripts/generate-countries.mjs` reads these rows of the registry and nothing else:

| Registry row                               | `CountryInfo` field                                               |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Name of country                            | `countryName` (verbatim)                                          |
| IBAN prefix country code (ISO 3166)        | `countryCode`                                                     |
| SEPA country                               | `sepa`                                                            |
| BBAN structure                             | `bbanStructure`                                                   |
| BBAN length                                | `bbanLength`                                                      |
| IBAN length                                | `ibanLength`                                                      |
| Bank identifier position within the BBAN   | `bankIdentifierPosition` (converted to zero-based, end exclusive) |
| Branch identifier position within the BBAN | `branchIdentifierPosition` (same conversion)                      |
| IBAN electronic format example             | `example`                                                         |

The registry also lists contact details of the national registrars (names, emails, phone numbers). They are not used, and the raw file is not committed to this repository.

The registry gives no structured, per-country position for the account number or the national check digits, so the package leaves them out.

### Consistency checks

The generator stops without writing anything if, for any country:

- the sum of the BBAN structure does not equal the declared BBAN length;
- the IBAN length is not the BBAN length + 4;
- the example IBAN has the wrong length or prefix, does not match the BBAN structure, or fails MOD-97.

All 89 registry entries pass these checks, and `tests/countries.test.ts` runs them again on the generated file.

The registry has a few inconsistencies of its own. None of them affects the generated data:

- BA (Bosnia and Herzegovina): the "BBAN example" row (`1990440001200279`) does not match the BBAN of the "IBAN electronic format example" (`BA391290079401028494`). The package uses the IBAN example, which is consistent and passes MOD-97.
- CZ (Czechia): the BBAN structure is written `4!n16!n` while the IBAN structure splits it as `4!n6!n10!n`. Both describe 20 digits.
- FK (Falkland Islands): the branch identifier position is `N/A`, stored as `null`.

## Test vectors

The tests use three kinds of IBANs and keep them apart (see [`tests/fixtures.ts`](./tests/fixtures.ts)):

1. Documented examples, published by an authoritative source to illustrate the format:
   - The 89 example IBANs of the SWIFT IBAN Registry (above), including those for IT, DE, FR, ES, NL, BE, AT, PT, IE, GB, CH and PL used in the main validation tests.
   - Wikipedia, ["International Bank Account Number"](https://en.wikipedia.org/wiki/International_Bank_Account_Number), revision 1376647818 (2026-09-25):
     `GB82 WEST 1234 5698 7654 32` (with its worked MOD-97 example `3214282912345698765432161182 mod 97 = 1`), `IE64 IRCE 9205 0112 3456 78` and `BI13 20001 10001 00001234567 89`.

   They may not be real accounts. Don't use them for payments.

2. Synthetic IBANs: random BBANs that match each country's structure, made with a seeded pseudo-random generator. A separate `BigInt` implementation in the tests computes their check digits. They are fictitious and only exercise the format and checksum logic.

3. Invalid IBANs: documented examples with characters changed, deleted, inserted or swapped, plus hand-written inputs that trigger a specific error such as empty input, illegal characters or an unknown country code.

## Updating the data

1. Download the latest IBAN Registry in TXT format from the official page above (or from the file URL).
2. Run:

   ```bash
   npm run generate:countries -- /path/to/iban-registry.txt 2026-10-02
   ```

   The second argument is the retrieval date written into the file header.

3. Review the diff of `src/countries.ts`, run `npm test`, and update this document (retrieval date, SHA-256, number of countries, last checked), the country table in `README.md` and `CHANGELOG.md`.
