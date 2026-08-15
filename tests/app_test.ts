/**
 * End-to-end through the application function, without opening a socket.
 * `createApp` returns a plain `(Request, client) => Response`, which is the
 * main practical benefit of keeping the HTTP layer thin.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { liveSites } from "../src/content/live.ts";
import { session, sessionSummary } from "../src/content/session.ts";
import { createApp } from "../src/app.ts";
import { parseConfig } from "../src/config.ts";
import { silentLogger } from "../src/log.ts";
import { scriptHash } from "../src/http/security.ts";
import { jsonLdScriptBody } from "../src/render/layout.ts";
import { structuredData } from "../src/content/site.ts";

const ORIGIN = "https://pedromdominguez.dev";

// Written inside `var/` so the suite runs under the same write permission the
// server itself is granted: --allow-write=var and nothing more.
async function buildApp(overrides: Record<string, string> = {}) {
  const config = parseConfig({
    PUBLIC_ORIGIN: ORIGIN,
    APP_ENV: "production",
    INBOX_PATH: `var/test/${crypto.randomUUID()}.jsonl`,
    ...overrides,
  });
  const jsonLd = structuredData(config.origin);
  return createApp({
    config,
    logger: silentLogger,
    render: { origin: config.origin, asset: (path) => `/static${path}`, jsonLd },
    security: { hsts: config.hsts, scriptHashes: [await scriptHash(jsonLdScriptBody(jsonLd))] },
    startedAt: new Date("2026-01-01T00:00:00Z"),
  });
}

const get = (path: string, init: RequestInit = {}) =>
  new Request(new URL(path, ORIGIN), { ...init });

const form = (body: string, headers: Record<string, string> = {}) =>
  new Request(new URL("/api/contact", ORIGIN), {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": ORIGIN,
      "accept": "application/json",
      ...headers,
    },
  });

const VALID = "name=Dana+Reed&email=dana@reedauto.example&message=" +
  "Our+three+bays+are+booked+on+a+paper+calendar+and+it+is+costing+us+jobs.";

Deno.test("the front page renders with the full security header set", async () => {
  const app = await buildApp();
  const response = await app(get("/"), "203.0.113.1");
  assertEquals(response.status, 200);
  assertStringIncludes(response.headers.get("content-type") ?? "", "text/html");
  assertStringIncludes(response.headers.get("content-security-policy") ?? "", "default-src 'none'");
  assertEquals(response.headers.get("x-content-type-options"), "nosniff");

  const body = await response.text();
  assertStringIncludes(body, "One Person.");
  assertStringIncludes(body, "One Paradigm Shift.");
});

Deno.test("the hero title can wrap on a narrow screen", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // A non-breaking space here makes the line one unbreakable token. At the
  // hero's clamped size that is wider than a phone, so the end of the line
  // hangs off the right edge and the page scrolls sideways to reach it.
  assert(!body.includes("One&nbsp;Paradigm"), "the hero title cannot wrap on a narrow screen");
  assert(!body.includes("One&nbsp;Person"), "the hero title cannot wrap on a narrow screen");
});

Deno.test("the hero session is served finished, not assembled by script", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // Every line, in the HTML, before any JavaScript runs. session.js only
  // re-plays what is already here, so losing this would leave visitors
  // without JavaScript looking at an empty terminal.
  for (const line of session) {
    assertStringIncludes(body, line.text);
  }
  assertStringIncludes(body, sessionSummary);

  // And it says it is an illustration rather than a recording.
  assertStringIncludes(body, "A session, condensed");
});

Deno.test("every live site on the roster is linked by name and host", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  for (const entry of liveSites) {
    assertStringIncludes(body, entry.name);
    assertStringIncludes(body, `https://${entry.host}`);
  }
  assertStringIncludes(body, `${liveSites.length} sites`);
});

Deno.test("an unknown path answers 404 with a page, not a stack trace", async () => {
  const app = await buildApp();
  const response = await app(get("/does-not-exist"), "203.0.113.1");
  assertEquals(response.status, 404);
  const body = await response.text();
  assert(!body.includes("Deno."), "internal detail leaked into the 404 page");
  assert(!body.includes("/home/"), "a filesystem path leaked into the 404 page");
});

Deno.test("HEAD returns the headers of GET and no body", async () => {
  const app = await buildApp();
  const head = await app(get("/", { method: "HEAD" }), "203.0.113.1");
  assertEquals(head.status, 200);
  assertEquals(await head.text(), "");
  assertStringIncludes(head.headers.get("content-security-policy") ?? "", "default-src 'none'");
});

Deno.test("unsupported methods are refused with an Allow header", async () => {
  const app = await buildApp();
  // TRACE and CONNECT are absent because the Fetch spec refuses to construct a
  // Request with them at all; `SUPPORTED_METHODS` covers those in router_test.
  for (const method of ["PUT", "DELETE", "PATCH"]) {
    const response = await app(get("/", { method }), "203.0.113.1");
    assertEquals(response.status, 405, `${method} should be refused`);
    assertEquals(response.headers.get("allow"), "GET, HEAD, POST, OPTIONS");
  }
});

Deno.test("a valid submission is accepted and stored", async () => {
  const app = await buildApp();
  const response = await app(form(VALID), "203.0.113.2");
  assertEquals(response.status, 200);
  assertEquals((await response.json()).ok, true);
});

Deno.test("a browser form post is answered with a redirect, not a re-postable page", async () => {
  const app = await buildApp();
  const response = await app(form(VALID, { accept: "text/html" }), "203.0.113.3");
  assertEquals(response.status, 303);
  assertEquals(response.headers.get("location"), "/thank-you");
});

Deno.test("a cross-site submission is refused before anything is parsed", async () => {
  const app = await buildApp();
  const response = await app(form(VALID, { origin: "https://evil.example" }), "203.0.113.4");
  assertEquals(response.status, 403);
});

Deno.test("a submission with no Origin at all is refused", async () => {
  const app = await buildApp();
  const request = new Request(new URL("/api/contact", ORIGIN), {
    method: "POST",
    body: VALID,
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
  });
  assertEquals((await app(request, "203.0.113.5")).status, 403);
});

Deno.test("an oversized submission is refused with 413", async () => {
  const app = await buildApp();
  const response = await app(form("message=" + "x".repeat(40_000)), "203.0.113.6");
  assertEquals(response.status, 413);
});

Deno.test("the rate limit closes after the configured number of submissions", async () => {
  const app = await buildApp({ CONTACT_RATE_LIMIT: "2" });
  const client = "203.0.113.7";
  assertEquals((await app(form(VALID), client)).status, 200);
  assertEquals((await app(form(VALID), client)).status, 200);

  const refused = await app(form(VALID), client);
  assertEquals(refused.status, 429);
  assert(Number(refused.headers.get("retry-after")) > 0, "Retry-After must be present");
});

Deno.test("the health endpoint says nothing about the system", async () => {
  const app = await buildApp();
  const body = await (await app(get("/healthz"), "203.0.113.8")).json();
  assertEquals(body, { status: "ok" });
});

Deno.test("robots and sitemap are generated from the configured origin", async () => {
  const app = await buildApp();
  assertStringIncludes(await (await app(get("/robots.txt"), "203.0.113.9")).text(), ORIGIN);
  assertStringIncludes(await (await app(get("/sitemap.xml"), "203.0.113.9")).text(), `${ORIGIN}/`);
});

Deno.test("a submitted script tag is rendered back as text, not markup", async () => {
  const app = await buildApp();
  const payload = "name=" + encodeURIComponent("<script>alert(1)</script>") +
    "&email=not-an-email&message=short";
  const response = await app(form(payload, { accept: "text/html" }), "203.0.113.10");
  assertEquals(response.status, 400);

  const body = await response.text();
  assert(!body.includes("<script>alert(1)</script>"), "submitted markup was echoed unescaped");
  assertStringIncludes(body, "&lt;script&gt;alert(1)&lt;/script&gt;");
});
