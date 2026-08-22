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
import { nav, site } from "../src/content/site.ts";
import { faq } from "../src/content/faq.ts";
import { comparison, plan, PLAN_ID, sources, splash } from "../src/content/pricing.ts";
import { recentInquiries } from "../src/contact/store.ts";
import {
  layers,
  modelPriceDrop,
  objections,
  quote,
  QUOTE_SECOND_CLAUSE,
  sources as thesisSources,
} from "../src/content/thesis.ts";
import { createContactStore } from "../src/admin/contact.ts";

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
  // The real store, so the JSON-LD and the policy hash it admits stay tied
  // together here exactly as they do in main.ts.
  const contact = await createContactStore(kv, config.origin);
  return createApp({
    config,
    logger: silentLogger,
    render: {
      origin: config.origin,
      asset: (path) => `/static${path}`,
      get jsonLd() {
        return contact.jsonLd();
      },
      get contact() {
        return contact.current();
      },
    },
    security: {
      hsts: config.hsts,
      get scriptHashes() {
        return contact.scriptHashes();
      },
    },
    startedAt: new Date("2026-01-01T00:00:00Z"),
    kv,
    contact,
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
  const contact = await createContactStore(kv, config.origin);
  const app = createApp({
    config,
    logger: silentLogger,
    render: {
      origin: config.origin,
      asset: (path) => `/static${path}`,
      get jsonLd() {
        return contact.jsonLd();
      },
      get contact() {
        return contact.current();
      },
    },
    security: {
      hsts: config.hsts,
      get scriptHashes() {
        return contact.scriptHashes();
      },
    },
    startedAt: new Date("2026-01-01T00:00:00Z"),
    kv,
    contact,
  });
  return { app, kv, contact };
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
  // The tagline survives in the page title; the eyebrow carries its localised
  // twin, which is a different string and asserted separately below.
  assertStringIncludes(body, `<title>${escapeHtml(`${site.name} — ${site.tagline}`)}</title>`);
});

Deno.test("the hero is readable in English before any script runs", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // The rotations replace text that is already there. If either first value is
  // missing, a visitor without JavaScript gets an empty line where the sentence
  // should be.
  const first = site.taglines[0];
  assertStringIncludes(body, `lang="${first.lang}"`);
  assertStringIncludes(body, escapeHtml(first.text));
  assertStringIncludes(body, "Websites that");
  assertStringIncludes(body, escapeHtml(site.disciplines[0]));
});

Deno.test("the hero names the live clients, and not itself", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  const others = liveSites.filter((entry) => entry.host !== site.domain);
  assert(others.length > 0, "the roster is only this site");
  assertStringIncludes(body, escapeHtml(others.map((entry) => entry.name).join(" · ")));

  // Citing itself as proof of itself is the failure mode worth naming.
  const hero = body.slice(body.indexOf('class="hero"'), body.indexOf("</section>"));
  const self = liveSites.find((entry) => entry.host === site.domain);
  if (self !== undefined) {
    assert(
      !hero.includes(`>${escapeHtml(self.name)}<`),
      "the hero offers itself as a reference",
    );
  }
});

Deno.test("the h1 is the name, and it is announced as a name", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // Split into letters for the reveal, so the name is not in the markup as one
  // string — which is exactly why the aria-label has to be.
  assertStringIncludes(body, `aria-label="${escapeHtml(site.name)}"`);
  for (const letter of site.name.replace(/ /g, "")) {
    assertStringIncludes(body, `<span class="hero__letter">${escapeHtml(letter)}</span>`);
  }
});

Deno.test("the hero title can wrap on a narrow screen", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // A non-breaking space makes a line one unbreakable token. At the hero's
  // clamped size that is wider than a phone, so the end of the line hangs off
  // the right edge and the page scrolls sideways to reach it. The name is the
  // live risk now — uppercase "DOMINGUEZ" is the longest word on the page.
  const hero = body.slice(body.indexOf('class="hero"'), body.indexOf("</section>"));
  assert(!hero.includes("&nbsp;"), "the hero cannot contain an unbreakable space");
  assert(
    !/<span class="hero__word">[^<]/.test(hero),
    "a word must be letter spans, or the reveal has nothing to stagger",
  );
});

Deno.test("the hero counts live sites rather than claiming a number", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // A hardcoded figure drifts away from the roster the moment one is added.
  assertStringIncludes(body, `${liveSites.length} live sites`);
});

Deno.test("the hero quotes the real price, once", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  const hero = body.slice(body.indexOf('class="hero"'), body.indexOf("</section>"));
  assertStringIncludes(hero, `$${plan.build}`);
  // portfolio-app says $275. Copying its hero must not copy its price.
  assert(!hero.includes("$275"), "the hero is quoting another site's price");
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

Deno.test("the menu carries its own way out", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // The open panel is z-index 40 and the toggle is an unpositioned sibling, so
  // the menu paints over the button that opened it. Without this, Escape and
  // tapping a link are the only ways back.
  const panel = body.match(/<nav class="masthead__nav"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert(panel.length > 0, "could not find the nav panel");
  assertStringIncludes(panel, "data-nav-close");
  assertStringIncludes(panel, "Close menu");
});

Deno.test("the thesis page argues, cites, and answers itself", async () => {
  const app = await buildApp();
  const response = await app(get("/thesis"), "203.0.113.1");
  assertEquals(response.status, 200);

  const body = await response.text();

  // The quotation, whole. This is the test that fails if a future edit crops
  // it to the half that flatters the argument.
  assertStringIncludes(body, escapeHtml(quote.text));
  assertStringIncludes(body, escapeHtml(QUOTE_SECOND_CLAUSE));
  assertStringIncludes(body, quote.speaker);

  // Every figure carries its source with it.
  assertStringIncludes(body, modelPriceDrop.label);
  for (const source of thesisSources) assertStringIncludes(body, source.url);

  // And the objections are actually on the page, not summarised away.
  for (const entry of objections) assertStringIncludes(body, escapeHtml(entry.objection));
});

Deno.test("the landing page summarises the thesis and hands off to it", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  assertStringIncludes(body, 'href="/thesis"');
  // The long argument lives in one place; the landing page must not grow a
  // second copy of it.
  assert(
    !body.includes(escapeHtml(quote.text)),
    "the full quotation is duplicated on the landing page",
  );
});

Deno.test("the layer stack is served finished, not assembled by script", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // Every layer and the final figure in the HTML: layers.js only replays what
  // is already here, so a visitor without JavaScript gets the whole diagram.
  for (const layer of layers) assertStringIncludes(body, escapeHtml(layer.name));
  assertStringIncludes(body, modelPriceDrop.label);
  assertEquals(
    [...body.matchAll(/data-layer-name/g)].length,
    layers.length,
    "the stack is not fully rendered server-side",
  );
});

Deno.test("the admin area is not linked, listed or indexed", async () => {
  const app = await buildApp();

  // Nothing on the public site points at it. Obscurity is not the control —
  // the session check is — but an unlinked door is not an invitation either.
  for (const path of ["/", "/thesis", "/pricing", "/thank-you"]) {
    const body = await (await app(get(path), "203.0.113.1")).text();
    assert(!body.includes("/admin"), `${path} links to the admin area`);
  }

  const sitemap = await (await app(get("/sitemap.xml"), "203.0.113.1")).text();
  assert(!sitemap.includes("admin"), "the admin area is in the sitemap");

  const robots = await (await app(get("/robots.txt"), "203.0.113.1")).text();
  assertStringIncludes(robots, "Disallow: /admin");
});

// --- failure handling -------------------------------------------------------
//
// The incident code is the only thing shared between the page a visitor sees and
// the line in the journal. Everything below is about keeping that true, and
// keeping the stack on the private side of the line.

/**
 * An app whose rendering throws, built by poisoning the `jsonLd` getter the
 * layout reads on every page. No test-only route is added to production code:
 * the failure comes from the same seam the real one came from.
 */
async function buildFailingApp() {
  const kv = await Deno.openKv(":memory:");
  const config = parseConfig({ PUBLIC_ORIGIN: ORIGIN, APP_ENV: "production" });
  const contact = await createContactStore(kv, config.origin);
  const app = createApp({
    config,
    logger: silentLogger,
    render: {
      origin: config.origin,
      asset: (path) => `/static${path}`,
      get jsonLd(): string {
        throw new Error("poisoned graph");
      },
      get contact() {
        return contact.current();
      },
    },
    security: {
      hsts: config.hsts,
      get scriptHashes() {
        return contact.scriptHashes();
      },
    },
    startedAt: new Date("2026-01-01T00:00:00Z"),
    kv,
    contact,
  });
  return { app, kv };
}

Deno.test("a thrown request answers 500 with a code and no stack", async () => {
  const { app, kv } = await buildFailingApp();
  try {
    const response = await app(new Request(`${ORIGIN}/`), "127.0.0.1");
    assertEquals(response.status, 500);
    const body = await response.text();

    const code = body.match(/[A-Z2-9]{5}/);
    assert(code !== null, "the page must carry an incident code to quote");

    assert(!body.includes(".ts:"), "a source path reached a visitor");
    assert(!/\bat [A-Za-z]+ \(/.test(body), "a stack frame reached a visitor");
    assert(!body.includes("poisoned graph"), "the exception text reached a visitor");
  } finally {
    kv.close();
  }
});

Deno.test("no public page ever leaks a stack frame", async () => {
  const app = await buildApp();
  for (const path of ["/", "/pricing", "/thesis", "/nothing-here", "/admin"]) {
    const body = await (await app(new Request(`${ORIGIN}${path}`), "127.0.0.1")).text();
    assert(!body.includes(".ts:"), `${path} leaked a source path`);
    assert(!/\bat [A-Za-z]+ \(/.test(body), `${path} leaked a stack frame`);
  }
});

Deno.test("the public failure page points at the phone, not at an inbox", async () => {
  const { app, kv } = await buildFailingApp();
  try {
    const body = await (await app(new Request(`${ORIGIN}/`), "127.0.0.1")).text();
    assertStringIncludes(body, "405-984-7036");
  } finally {
    kv.close();
  }
});

Deno.test("a wrong method on an admin route is refused, not blamed on the visitor", async () => {
  const app = await buildApp();
  const response = await app(
    new Request(`${ORIGIN}/admin/dashboard`, { method: "POST", body: "" }),
    "127.0.0.1",
  );
  assertEquals(response.status, 405);
  const body = await response.text();

  // Scoped to the notice: the footer carries the email on every page, and that
  // is fine. The complaint was the failure message itself saying "email me".
  const notice = body.match(/<section class="notice">[\s\S]*?<\/section>/)?.[0] ?? "";
  assert(notice.length > 0, "the failure page should render a notice");
  assert(!notice.includes("@"), "the failure message must not tell the owner to email himself");
  assert(/[A-Z2-9]{5}/.test(notice), "a refused admin request still gets a code");
});

Deno.test("when the failure page itself fails, the code still reaches the visitor", async () => {
  const kv = await Deno.openKv(":memory:");
  const config = parseConfig({ PUBLIC_ORIGIN: ORIGIN, APP_ENV: "production" });
  const contact = await createContactStore(kv, config.origin);
  const app = createApp({
    config,
    logger: silentLogger,
    render: {
      origin: config.origin,
      // Inside the layout, so rendering the error page throws too. This is the
      // scenario the plain-string fallback exists for.
      asset: () => {
        throw new Error("layout is gone");
      },
      get jsonLd() {
        return contact.jsonLd();
      },
      get contact() {
        return contact.current();
      },
    },
    security: {
      hsts: config.hsts,
      get scriptHashes() {
        return contact.scriptHashes();
      },
    },
    startedAt: new Date("2026-01-01T00:00:00Z"),
    kv,
    contact,
  });

  try {
    const response = await app(new Request(`${ORIGIN}/`), "127.0.0.1");
    assertEquals(response.status, 500);
    const body = await response.text();
    assert(/[A-Z2-9]{5}/.test(body), "the incident code must survive the fallback");
    assert(!body.includes("layout is gone"), "the fallback must not leak either");
  } finally {
    kv.close();
  }
});

Deno.test("the hero says Español with its tilde", async () => {
  const app = await buildApp();
  const body = await (await app(get("/"), "203.0.113.1")).text();

  // The stat strip is uppercased in CSS, which is fine — but a source string
  // spelled "Espanol" renders ESPANOL, misspelling the one word on the page
  // aimed at the readers it is there to reach.
  assertStringIncludes(body, "Español");
  assert(!body.includes("Espanol"), "Español lost its tilde somewhere");
});
