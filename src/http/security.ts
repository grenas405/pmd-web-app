/**
 * security.ts — the headers every response carries, in one readable place.
 *
 * The policy is deny-by-default: `default-src 'none'` means nothing loads
 * unless a directive below says so. That is only sustainable because the site
 * ships no third-party assets, no inline event handlers and no inline styles —
 * the single inline script (JSON-LD metadata) is admitted by its exact hash,
 * so the policy needs neither 'unsafe-inline' nor a per-request nonce.
 */

import { encodeBase64 } from "@std/encoding/base64";

export interface SecurityOptions {
  /** Emit Strict-Transport-Security and upgrade-insecure-requests. */
  readonly hsts: boolean;
  /** CSP source expressions for permitted inline scripts, e.g. "'sha256-…'". */
  readonly scriptHashes: readonly string[];
}

/** SHA-256 of `text` as a CSP `'sha256-…'` source expression. */
export async function scriptHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return `'sha256-${encodeBase64(digest)}'`;
}

/** Build the Content-Security-Policy header value. Pure. */
export function contentSecurityPolicy(options: SecurityOptions): string {
  const directives: string[] = [
    "default-src 'none'",
    `script-src 'self'${options.scriptHashes.map((h) => ` ${h}`).join("")}`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
  ];
  if (options.hsts) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

/**
 * Features this site never uses. Denying them here means an injected script —
 * or a future careless edit — still cannot reach the camera or the geolocation
 * API from this origin.
 */
const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "usb=()",
].join(", ");

/** Headers applied to every response, including errors. Pure. */
export function securityHeaders(options: SecurityOptions): Headers {
  const headers = new Headers({
    "content-security-policy": contentSecurityPolicy(options),
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": PERMISSIONS_POLICY,
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
  });
  if (options.hsts) {
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return headers;
}

/** Copy the security headers onto a response without clobbering its own. */
export function withSecurityHeaders(response: Response, options: SecurityOptions): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of securityHeaders(options)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Same-origin check for state-changing requests.
 *
 * Browsers set `Origin` on every POST, so a mismatch is a cross-site request.
 * A missing `Origin` is rejected rather than trusted: this endpoint is only
 * ever reached by a form on this site, and non-browser clients can send it too.
 */
export function isAllowedOrigin(request: Request, allowed: ReadonlySet<string>): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return false;
  return allowed.has(origin);
}
