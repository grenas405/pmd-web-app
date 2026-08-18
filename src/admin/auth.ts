/**
 * auth.ts — the password, the session, and the lock on the door.
 *
 * Nothing here is clever, and that is deliberate: this is the one part of the
 * site where being interesting is a defect. PBKDF2 from Web Crypto, a random
 * session token in KV with an expiry the database enforces, and a failure
 * counter that survives a restart.
 *
 * That last point is not a detail. `src/http/ratelimit.ts` counts in memory,
 * which is fine for a contact form and wrong for a login: an attacker would get
 * a fresh budget of guesses every time the service restarted. These counts live
 * in KV.
 */

import { encodeHex } from "@std/encoding/hex";
import { getCookies } from "@std/http/cookie";

/** OWASP's floor for PBKDF2-HMAC-SHA256 at the time of writing. */
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_COOKIE = "pmd_admin";

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export interface Credential {
  readonly algorithm: "PBKDF2-SHA256";
  readonly iterations: number;
  /** Hex. Random per password, stored beside the hash it belongs to. */
  readonly salt: string;
  readonly hash: string;
  readonly updatedAt: string;
}

export interface Session {
  readonly createdAt: string;
}

const CREDENTIAL_KEY: Deno.KvKey = ["admin", "credential"];
const sessionKey = (token: string): Deno.KvKey => ["session", token];
const failureKey = (client: string): Deno.KvKey => ["login-fail", client];

/** PBKDF2-HMAC-SHA256. Pure apart from the platform's own crypto. */
async function derive(
  password: string,
  // Pinned to ArrayBuffer rather than the generic Uint8Array: Web Crypto takes
  // a BufferSource, which a possibly-shared buffer does not satisfy.
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/**
 * Compare without leaking where the difference is.
 *
 * `a === b` on a hash returns as soon as two bytes differ, and the time it took
 * says how much of the guess was right. This always reads every byte.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return difference === 0;
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Build the stored record for a password. Pure; the caller writes it. */
export async function toCredential(password: string): Promise<Credential> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return {
    algorithm: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt: encodeHex(salt),
    hash: encodeHex(hash),
    updatedAt: new Date().toISOString(),
  };
}

export async function setPassword(kv: Deno.Kv, password: string): Promise<void> {
  await kv.set(CREDENTIAL_KEY, await toCredential(password));
}

export async function hasPassword(kv: Deno.Kv): Promise<boolean> {
  return (await kv.get<Credential>(CREDENTIAL_KEY)).value !== null;
}

/**
 * Check a password against what is stored.
 *
 * When no credential exists it still derives a key from a throwaway salt before
 * answering, so "there is no admin account" and "that was the wrong password"
 * take the same time to say.
 */
export async function verifyPassword(kv: Deno.Kv, password: string): Promise<boolean> {
  const stored = (await kv.get<Credential>(CREDENTIAL_KEY)).value;
  if (stored === null) {
    await derive(password, crypto.getRandomValues(new Uint8Array(SALT_BYTES)), ITERATIONS);
    return false;
  }
  const candidate = await derive(password, fromHex(stored.salt), stored.iterations);
  return timingSafeEqual(candidate, fromHex(stored.hash));
}

/* --- failure counting ----------------------------------------------------- */

export interface Lockout {
  readonly locked: boolean;
  readonly remaining: number;
}

export async function lockoutState(kv: Deno.Kv, client: string): Promise<Lockout> {
  const failures = (await kv.get<number>(failureKey(client))).value ?? 0;
  return { locked: failures >= MAX_FAILURES, remaining: Math.max(0, MAX_FAILURES - failures) };
}

/** One more wrong guess. The row expires on its own, so nothing resets it. */
export async function recordFailure(kv: Deno.Kv, client: string): Promise<void> {
  const key = failureKey(client);
  const current = (await kv.get<number>(key)).value ?? 0;
  await kv.set(key, current + 1, { expireIn: LOCKOUT_MS });
}

export async function clearFailures(kv: Deno.Kv, client: string): Promise<void> {
  await kv.delete(failureKey(client));
}

/* --- sessions ------------------------------------------------------------- */

/** A new session. The expiry is KV's job rather than a field to check later. */
export async function createSession(kv: Deno.Kv): Promise<string> {
  const token = encodeHex(crypto.getRandomValues(new Uint8Array(32)));
  const session: Session = { createdAt: new Date().toISOString() };
  await kv.set(sessionKey(token), session, { expireIn: SESSION_TTL_MS });
  return token;
}

export async function readSession(kv: Deno.Kv, token: string): Promise<Session | null> {
  if (token.length !== 64 || !/^[0-9a-f]+$/.test(token)) return null;
  return (await kv.get<Session>(sessionKey(token))).value;
}

export async function destroySession(kv: Deno.Kv, token: string): Promise<void> {
  await kv.delete(sessionKey(token));
}

/** The token this request is carrying, if any. Pure. */
export function tokenFrom(request: Request): string | null {
  return getCookies(request.headers)[SESSION_COOKIE] ?? null;
}

/** The signed-in session for this request, or null. */
export async function currentSession(kv: Deno.Kv, request: Request): Promise<Session | null> {
  const token = tokenFrom(request);
  return token === null ? null : await readSession(kv, token);
}

/**
 * The Set-Cookie value. `Secure` follows the origin so the cookie still works
 * on http://localhost in development and is never sent in clear in production.
 */
export function sessionCookie(token: string, origin: string): string {
  const secure = origin.startsWith("https://") ? "; Secure" : "";
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

export function clearedCookie(origin: string): string {
  const secure = origin.startsWith("https://") ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}

export const limits = { MAX_FAILURES, LOCKOUT_MS, SESSION_TTL_MS, SESSION_COOKIE } as const;
