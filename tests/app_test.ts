/**
 * End-to-end through the application function, without opening a socket.
 * `createApp` returns a plain `(Request, client) => Response`, which is the
 * main practical benefit of keeping the HTTP layer thin.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { liveSites } from "../src/content/live.ts";
import { projects } from "../src/content/projects.ts";
import { session, sessions, sessionSummary } from "../src/content/session.ts";
import { createApp } from "../src/app.ts";
import { parseConfig } from "../src/config.ts";
import { silentLogger } from "../src/log.ts";
import { scriptHash } from "../src/http/security.ts";
import { escapeHtml } from "../src/render/html.ts";
import { inlineScriptHashes } from "../src/render/layout.ts";
import { nav } from "../src/content/site.ts";
import { faq } from "../src/content/faq.ts";
import { comparison, plan, PLAN_ID, sources, splash } from "../src/content/pricing.ts";
import { recentInquiries } from "../src/contact/store.ts";
import { structuredData } from "../src/content/site.ts";

const ORIGIN = "https://pedromdominguez.dev";

// Each app gets its own in-memory KV, so tests neither share enquiries nor
// leave a database behind. The handle is returned alongside the app for the
// tests that need to read back what was stored.
async function buildApp(overrides: Record<string, string> = {}) {
  const kv = await Deno.openKv(":memory:");
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
    security: { hsts: config.hsts, scriptHashes: await inlineScriptHashes(jsonLd) },
    startedAt: new Date("2026-01-01T00:00:00Z"),
    kv,
  });
}

/** For the tests that assert on what was stored, not just what was answered. */
async function buildAppWithKv(overrides: Record<string, string> = {}) {
  const kv = await Deno.openKv(":memory:");
  const config = parseConfig({
    PUBLIC_ORIGIN: ORIGIN,
    APP_ENV: "production",
    INBOX_PATH: `var/test/${crypto.randomUUID()}.jsonl`,
    ...overrides,
  });
  const jsonLd = structuredData(config.origin);
  const app = createApp({
    config,
    logger: silentLogger,
    render: { origin: config.origin, asset: (path) => `/static${path}`, jsonLd },
    security: { hsts: config.hsts, scriptHashes: await inlineScriptHashes(jsonLd) },
    startedAt: new Date("2026-01-01T00:00:00Z"),
    kv,
  });
  return { app, kv };
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

Deno.test("the rotation reaches the client as data, with one entry per subject", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // Escaped into an attribute, not an inline script — which is why the CSP can
  // stay at one hash and no nonce.
  const match = body.match(/data-sessions="([^"]*)"/);
  assert(match !== null, "the figure carries no rotation data");

  const decoded = (match[1] ?? "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

  const rotation = JSON.parse(decoded) as ReadonlyArray<{ path: string; rows: unknown[] }>;
  assertEquals(rotation.length, sessions.length);

  for (const entry of rotation) {
    // session.js refuses any entry whose length does not match the rendered
    // rows; if that ever stops holding, the rotation silently stops working.
    assertEquals(entry.rows.length, session.length, `${entry.path} has the wrong row count`);
  }
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

Deno.test("every inline script in the page is admitted by the policy", async () => {
  const app = await buildApp();
  const response = await app(get("/"), "203.0.113.1");
  const policy = response.headers.get("content-security-policy") ?? "";
  const body = await response.text();

  // Read the scripts back out of the served HTML rather than trusting the list
  // that built the header. A future inline script added to layout.ts and not
  // to inlineScriptHashes() fails here instead of in a browser console.
  const inline = [...body.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1] ?? "");
  assertEquals(inline.length, 2, "expected the JSON-LD and the enhancement flag");

  for (const script of inline) {
    assertStringIncludes(policy, await scriptHash(script));
  }
});

Deno.test("the enhancement flag runs before the stylesheet", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // The stylesheet keys the whole navigation off this flag. Arriving after it
  // would show the no-JS fallback and then snatch it away.
  const flag = body.indexOf("documentElement.dataset.js");
  const stylesheet = body.indexOf("/css/site.css");
  assert(flag > -1, "the enhancement flag is missing");
  assert(flag < stylesheet, "the flag must be emitted before the stylesheet");
});

Deno.test("the navigation is in the markup, menu or no menu", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // Without JavaScript these links are the navigation, so they are rendered
  // whatever happens — never built by script.
  for (const link of nav) {
    assertStringIncludes(body, `href="${link.href}"`);
    assertStringIncludes(body, link.label);
    assertStringIncludes(body, link.description);
    assertStringIncludes(body, `>${link.index}<`);
  }
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

Deno.test("the pricing page states the price and the arithmetic behind it", async () => {
  const app = await buildApp();
  const response = await app(get("/pricing"), "203.0.113.1");
  assertEquals(response.status, 200);

  const body = await response.text();
  // All three numbers, because the page that shows only two invites the text
  // message it exists to prevent.
  assertStringIncludes(body, `$${plan.build}`);
  assertStringIncludes(body, `$${plan.care}`);
  assertStringIncludes(body, `$${plan.firstYear}`);

  for (const row of comparison) assertStringIncludes(body, row.typical);
  for (const source of sources) assertStringIncludes(body, source.url);
});

Deno.test("the landing page carries the offer and the questions", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  assertStringIncludes(body, `$${plan.build}`);
  assertStringIncludes(body, "/pricing");
  for (const entry of faq) assertStringIncludes(body, entry.question);

  // The answers are also structured data, which is what can put them in a
  // search result rather than only on the page.
  assertStringIncludes(body, "FAQPage");
});

Deno.test("a plan we offer reaches the form; anything else does not", async () => {
  const app = await buildApp();

  const carried = await (await app(get(`/?plan=${PLAN_ID}`), "203.0.113.1")).text();
  assertStringIncludes(carried, `name="plan"`);
  assertStringIncludes(carried, `value="${PLAN_ID}"`);

  // An unknown value is ignored rather than echoed into the page.
  const nonsense = await (await app(get("/?plan=free-forever"), "203.0.113.1")).text();
  assert(!nonsense.includes(`name="plan"`), "an unknown plan was rendered into the form");
  assert(!nonsense.includes("free-forever"), "an unknown plan was echoed back");
});

Deno.test("a pricing enquiry is stored as one, and a plain one is not", async () => {
  const { app, kv } = await buildAppWithKv();
  try {
    const priced = await app(form(`${VALID}&plan=${PLAN_ID}`), "203.0.113.7");
    assertEquals(priced.status, 200);

    const plain = await app(form(VALID), "203.0.113.8");
    assertEquals(plain.status, 200);

    const stored = await recentInquiries(kv);
    assertEquals(stored.length, 2);
    assertEquals(stored.filter((r) => r.kind === "pricing").length, 1);
    assertEquals(stored.filter((r) => r.kind === "contact").length, 1);
    assertEquals(stored.find((r) => r.kind === "pricing")?.plan, PLAN_ID);
  } finally {
    kv.close();
  }
});

Deno.test("a tampered plan is dropped, not turned into an error", async () => {
  const { app, kv } = await buildAppWithKv();
  try {
    // The visitor cannot see or correct this field, so a bad value must never
    // become a validation message they are asked to fix.
    const response = await app(form(`${VALID}&plan=enterprise-0`), "203.0.113.9");
    assertEquals(response.status, 200);

    const stored = await recentInquiries(kv);
    assertEquals(stored.length, 1);
    assertEquals(stored[0]?.kind, "contact");
    assertEquals(stored[0]?.plan, null);
  } finally {
    kv.close();
  }
});

Deno.test("the work section shows real, clickable case studies", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  for (const project of projects) {
    assertStringIncludes(body, project.name);
    assertStringIncludes(body, `href="${project.href}"`);
    // Through the same escaper the renderer uses: the summaries contain
    // apostrophes, which reach the page as &#39; and would otherwise make this
    // assertion fail for the one reason that is not a bug.
    assertStringIncludes(body, escapeHtml(project.summary));
  }
});

Deno.test("no invented engagement survives anywhere in the page", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // These four were fictional placeholders. They were removed rather than
  // commented out, and this fails loudly if one is ever pasted back.
  for (const invented of ["Route Ledger", "Shop Scheduler", "Permit Intake", "Counter Menu"]) {
    assert(!body.includes(invented), `the fictional case study "${invented}" is back on the page`);
  }
});

Deno.test("the splash is served closed, so no-JavaScript visitors never see it", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  const dialog = body.match(/<dialog[^>]*data-splash[^>]*>/);
  assert(dialog !== null, "the landing page carries no splash dialog");

  // Without `open`, a <dialog> is hidden in every browser. Adding it here
  // would strand a visitor with no JavaScript inside a modal that has nothing
  // to close it — which is the one way this feature could really hurt someone.
  assert(!/\bopen\b/.test(dialog[0]), "the splash dialog is served already open");
});

Deno.test("the splash quotes the same numbers as the pricing page", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  assertStringIncludes(body, escapeHtml(splash.title));
  assertStringIncludes(body, `$${plan.build}`);
  assertStringIncludes(body, `$${plan.care}`);
  assertStringIncludes(body, `$${plan.firstYear}`);
  for (const point of splash.points) assertStringIncludes(body, escapeHtml(point));
});

Deno.test("the splash belongs to the landing page alone", async () => {
  const app = await buildApp();

  // On /pricing it would be an advertisement for the page already being read.
  const pricingPage = await (await app(get("/pricing"), "203.0.113.1")).text();
  assert(!pricingPage.includes("data-splash"), "the splash follows the visitor to /pricing");

  const thanks = await (await app(get("/thank-you"), "203.0.113.1")).text();
  assert(!thanks.includes("data-splash"), "the splash appears after a message is sent");
});

Deno.test("the splash sits outside main, where the menu cannot make it inert", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // nav.js marks `main, footer` inert while the full-screen menu is open, and
  // inert is inherited by a top-layer dialog nested under it. Inside <main>,
  // the splash would be unclickable for anyone who had opened the menu once.
  const mainEnd = body.indexOf("</main>");
  const splashAt = body.indexOf("data-splash");
  assert(mainEnd > -1 && splashAt > -1);
  assert(splashAt > mainEnd, "the splash is nested inside <main>");
});

Deno.test("nothing turns body into a scroll container under the sticky masthead", async () => {
  const css = await Deno.readTextFile("static/css/site.css");

  // `overflow-x: hidden` on body makes it a scroll container, and a scroll
  // container is what `position: sticky` resolves against — the masthead would
  // stick to the body's scroll box instead of the viewport and stop following
  // the page, taking the menu button off-screen after any in-page nav link.
  // `clip` clips without establishing one.
  const body = css.match(/\nbody \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert(body.length > 0, "could not find the body rule");
  assert(
    !/overflow(-x)?:\s*(hidden|auto|scroll)/.test(body),
    "body has an overflow that would break the sticky masthead",
  );

  // And the scroll lock must not resize the viewport: without a reserved
  // gutter, opening the menu widens the page by the scrollbar's width, which
  // near 60rem flips the desktop breakpoint and hides the toggle.
  assertStringIncludes(css, "scrollbar-gutter: stable");
});
