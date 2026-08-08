import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import {
  contentSecurityPolicy,
  isAllowedOrigin,
  scriptHash,
  securityHeaders,
} from "../src/http/security.ts";
import { jsonLdScriptBody } from "../src/render/layout.ts";
import { structuredData } from "../src/content/site.ts";

const base = { hsts: false, scriptHashes: [] as string[] };

Deno.test("the policy denies everything that is not explicitly allowed", () => {
  const policy = contentSecurityPolicy(base);
  assertStringIncludes(policy, "default-src 'none'");
  assertStringIncludes(policy, "frame-ancestors 'none'");
  assertStringIncludes(policy, "base-uri 'none'");
  assertStringIncludes(policy, "object-src 'none'");
  assertStringIncludes(policy, "form-action 'self'");
});

Deno.test("the policy never weakens script or style loading", () => {
  const policy = contentSecurityPolicy({ ...base, scriptHashes: ["'sha256-abc'"] });
  assert(!policy.includes("unsafe-inline"), "unsafe-inline must never appear");
  assert(!policy.includes("unsafe-eval"), "unsafe-eval must never appear");
  assert(!policy.includes("*"), "wildcard sources must never appear");
  assertStringIncludes(policy, "script-src 'self' 'sha256-abc'");
});

Deno.test("upgrade-insecure-requests and HSTS travel together", () => {
  assert(!contentSecurityPolicy(base).includes("upgrade-insecure-requests"));
  assertStringIncludes(
    contentSecurityPolicy({ ...base, hsts: true }),
    "upgrade-insecure-requests",
  );
  assertEquals(securityHeaders(base).get("strict-transport-security"), null);
  assertStringIncludes(
    securityHeaders({ ...base, hsts: true }).get("strict-transport-security") ?? "",
    "max-age=31536000",
  );
});

Deno.test("every response carries the baseline hardening headers", () => {
  const headers = securityHeaders(base);
  assertEquals(headers.get("x-content-type-options"), "nosniff");
  assertEquals(headers.get("x-frame-options"), "DENY");
  assertEquals(headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assertEquals(headers.get("cross-origin-opener-policy"), "same-origin");
  assertStringIncludes(headers.get("permissions-policy") ?? "", "geolocation=()");
});

Deno.test("the JSON-LD hash in the policy matches the script that is emitted", async () => {
  const json = structuredData("https://pedromdominguez.dev");
  const hash = await scriptHash(jsonLdScriptBody(json));
  assertStringIncludes(contentSecurityPolicy({ ...base, scriptHashes: [hash] }), hash);
  assert(hash.startsWith("'sha256-"));
});

Deno.test("state-changing requests require a recognised Origin", () => {
  const allowed = new Set(["https://pedromdominguez.dev"]);
  const withOrigin = (origin?: string) =>
    new Request("https://pedromdominguez.dev/api/contact", {
      method: "POST",
      headers: origin === undefined ? {} : { origin },
    });

  assert(isAllowedOrigin(withOrigin("https://pedromdominguez.dev"), allowed));
  assert(!isAllowedOrigin(withOrigin("https://evil.example"), allowed));
  assert(!isAllowedOrigin(withOrigin("null"), allowed));
  assert(!isAllowedOrigin(withOrigin(), allowed), "a missing Origin must not be trusted");
});
