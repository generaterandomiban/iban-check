const CODE_0 = 48;
const CODE_A = 65;

/**
 * Remainder of the division by 97 of the number obtained by replacing each letter with
 * two digits (A = 10, ..., Z = 35), as defined by ISO 7064 MOD 97-10.
 *
 * The number is processed one character at a time, so the running value never exceeds
 * 96 * 100 + 35 = 9635. This avoids the precision loss of converting a 30+ digit value to
 * a JavaScript `Number`, and needs no `BigInt`.
 *
 * `value` must contain only `0-9` and `A-Z`.
 */
export function mod97(value: string): number {
  let remainder = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    remainder =
      code >= CODE_A
        ? (remainder * 100 + code - CODE_A + 10) % 97
        : (remainder * 10 + code - CODE_0) % 97;
  }
  return remainder;
}

/**
 * MOD-97 check of a normalized IBAN: moves the first four characters to the end and
 * verifies that the remainder is 1.
 */
export function isValidChecksum(iban: string): boolean {
  return mod97(iban.slice(4) + iban.slice(0, 4)) === 1;
}
