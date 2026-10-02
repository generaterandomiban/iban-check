# Security policy

## Supported versions

Only the latest released version of iban-check receives security fixes.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a vulnerability

**Please do not report security vulnerabilities in public GitHub issues, discussions or pull requests.**

Report vulnerabilities by email to sec@generaterandomiban.com.

If private vulnerability reporting is enabled for the GitHub repository, you can also use the "Report a vulnerability" button in its Security tab.

Please include:

- a description of the issue and its impact;
- steps to reproduce, or a proof of concept;
- the affected version(s);
- any suggested fix, if you have one.

## What to expect

We'll acknowledge your report as soon as we can and keep you updated. Once the issue is confirmed, we'll publish a release with the fix and, if you agree, credit you in the release notes.

Please give us reasonable time to release the fix before you disclose the issue publicly.

## Scope

iban-check is a local validation library with no runtime dependencies and no network access. Examples of relevant issues:

- inputs that cause excessive CPU or memory use (denial of service);
- IBANs that are accepted although they violate the rules described in the README (validation bypass);
- anything that would cause the package to send data anywhere.

A valid IBAN is only well formed. It doesn't prove that the account exists (see "Limitations" in the README), so accepting an IBAN for an account that doesn't exist is not a vulnerability.
