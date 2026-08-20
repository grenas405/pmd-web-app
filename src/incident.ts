/**
 * incident.ts — a short code shared between a failed response and its log line.
 *
 * The failure is already recorded; the problem is joining the two ends. "A
 * customer said the site broke this morning" is a grep across a day of journal.
 * `grep 7QK2M` is one line.
 *
 * The alphabet drops 0/O and 1/I/L, because this code has to survive being read
 * aloud over the phone or retyped from a screenshot. Five characters of the
 * remaining 32 is about a million codes — collisions are irrelevant when the
 * code is only ever a search hint scoped to a day of logs.
 */

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LENGTH = 5;

/** A fresh incident code. Not a secret, not an identifier — a search key. */
export function newIncidentCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  let code = "";
  for (const byte of bytes) {
    // Modulo bias across 31 symbols is immaterial for a search hint.
    code += ALPHABET[byte % ALPHABET.length];
  }
  return code;
}
