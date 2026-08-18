/**
 * admin_test.ts — the properties that make the door a door.
 *
 * These are the tests worth having: not that the dashboard renders, but that
 * it cannot be reached, that a password cannot be recovered from what is
 * stored, that guesses run out, and that changing the contact details does not
 * silently break the Content-Security-Policy.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createApp } from "../src/app.ts";
import { parseConfig } from "../src/config.ts";
import { silentLogger } from "../src/log.ts";
import { scriptHash } from "../src/http/security.ts";
import { createContactStore } from "../src/admin/contact.ts";
import {
  clearFailures,
  createSession,
  destroySession,
  hasPassword,
  limits,
  lockoutState,
  readSession,
  recordFailure,
  setPassword,
  verifyPassword,
} from "../src/admin/auth.ts";

const ORIGIN = "https://pedromdominguez.dev";
const PASSWORD = "a-long-enough-password";

async function buildAdmin() {
  const kv = await Deno.openKv(":memory:");
  const config = parseConfig({ PUBLIC_ORIGIN: ORIGIN, APP_ENV: "production" });
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

const get = (path: string, headers: Record<string, string> = {}) =>
  new Request(new URL(path, ORIGIN), { headers });

const post = (path: string, body: string, headers: Record<string, string> = {}) =>
  new Request(new URL(path, ORIGIN), {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "origin": ORIGIN,
      ...headers,
    },
  });

Deno.test("a password verifies, a near miss does not, and neither is stored", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    assertEquals(await hasPassword(kv), false);
    await setPassword(kv, PASSWORD);

    assert(await verifyPassword(kv, PASSWORD));
    assert(!await verifyPassword(kv, PASSWORD + "!"));
    assert(!await verifyPassword(kv, ""));

    // Nothing recoverable is on disk: no plaintext, and a salt that makes two
    // identical passwords hash differently.
    const stored = JSON.stringify((await kv.get(["admin", "credential"])).value);
    assert(!stored.includes(PASSWORD), "the password itself is in the record");
    assertStringIncludes(stored, "PBKDF2-SHA256");
  } finally {
    kv.close();
  }
});

Deno.test("the same password twice produces different stored hashes", async () => {
  const a = await Deno.openKv(":memory:");
  const b = await Deno.openKv(":memory:");
  try {
    await setPassword(a, PASSWORD);
    await setPassword(b, PASSWORD);
    const first = JSON.stringify((await a.get(["admin", "credential"])).value);
    const second = JSON.stringify((await b.get(["admin", "credential"])).value);
    // If these matched, the salt would not be doing its job and one rainbow
    // table would open every install.
    assert(first !== second, "the salt is not random per password");
  } finally {
    a.close();
    b.close();
  }
});

Deno.test("a session can be created, read, and destroyed", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const token = await createSession(kv);
    assertEquals(token.length, 64);
    assert(await readSession(kv, token) !== null);

    await destroySession(kv, token);
    assertEquals(await readSession(kv, token), null, "signing out left the token usable");

    // A shape that is not a token is refused without touching the database.
    assertEquals(await readSession(kv, "not-a-token"), null);
  } finally {
    kv.close();
  }
});

Deno.test("guesses run out, and the count is not held in memory", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    for (let i = 0; i < limits.MAX_FAILURES; i++) {
      assertEquals((await lockoutState(kv, "203.0.113.9")).locked, false);
      await recordFailure(kv, "203.0.113.9");
    }
    assert((await lockoutState(kv, "203.0.113.9")).locked, "the client was never locked out");

    // Another client is unaffected, and a success clears the count.
    assertEquals((await lockoutState(kv, "203.0.113.10")).locked, false);
    await clearFailures(kv, "203.0.113.9");
    assertEquals((await lockoutState(kv, "203.0.113.9")).locked, false);
  } finally {
    kv.close();
  }
});

Deno.test("every room behind the door needs a session", async () => {
  const { app, kv } = await buildAdmin();
  try {
    for (const path of ["/admin/dashboard"]) {
      const response = await app(get(path), "203.0.113.1");
      assertEquals(response.status, 303, `${path} answered without a session`);
      assertEquals(response.headers.get("location"), "/admin");
      await response.body?.cancel();
    }

    // And the writes, too — not just the pages.
    for (const path of ["/admin/enquiry", "/admin/contact"]) {
      const response = await app(post(path, "action=delete&id=x"), "203.0.113.1");
      assertEquals(response.status, 303, `${path} accepted a write without a session`);
      await response.body?.cancel();
    }
  } finally {
    kv.close();
  }
});

Deno.test("signing in requires the password, and refuses a foreign origin", async () => {
  const { app, kv } = await buildAdmin();
  try {
    await setPassword(kv, PASSWORD);

    const wrong = await app(post("/admin", "password=nope"), "203.0.113.1");
    assertEquals(wrong.status, 401);
    const body = await wrong.text();
    assertStringIncludes(body, "That did not work.");
    // Says nothing about whether an account exists or which half was wrong.
    assert(!body.includes("no admin"), "the failure message leaks account state");

    const foreign = await app(
      post("/admin", `password=${PASSWORD}`, { origin: "https://evil.example" }),
      "203.0.113.2",
    );
    assertEquals(foreign.status, 403);
    await foreign.body?.cancel();

    const right = await app(post("/admin", `password=${PASSWORD}`), "203.0.113.3");
    assertEquals(right.status, 303);
    assertEquals(right.headers.get("location"), "/admin/dashboard");
    const cookie = right.headers.get("set-cookie") ?? "";
    assertStringIncludes(cookie, "HttpOnly");
    assertStringIncludes(cookie, "SameSite=Strict");
    assertStringIncludes(cookie, "Secure");
    await right.body?.cancel();
  } finally {
    kv.close();
  }
});

Deno.test("a signed-in session reaches the dashboard, and signing out ends it", async () => {
  const { app, kv } = await buildAdmin();
  try {
    await setPassword(kv, PASSWORD);
    const token = await createSession(kv);
    const cookie = { cookie: `${limits.SESSION_COOKIE}=${token}` };

    const dashboard = await app(get("/admin/dashboard", cookie), "203.0.113.1");
    assertEquals(dashboard.status, 200);
    assertEquals(dashboard.headers.get("cache-control"), "no-store");
    assertStringIncludes(dashboard.headers.get("x-robots-tag") ?? "", "noindex");
    await dashboard.body?.cancel();

    const out = await app(post("/admin/signout", "", cookie), "203.0.113.1");
    assertEquals(out.status, 303);
    await out.body?.cancel();

    const after = await app(get("/admin/dashboard", cookie), "203.0.113.1");
    assertEquals(after.status, 303, "the token still worked after signing out");
    await after.body?.cancel();
  } finally {
    kv.close();
  }
});

Deno.test("changing the contact details keeps the policy and the page in step", async () => {
  const { app, kv, contact } = await buildAdmin();
  try {
    await contact.save({
      email: "new@example.com",
      phone: "405-555-0100",
      phoneHref: "sms:+14055550100",
      phoneNote: "Text only",
    });

    const response = await app(get("/"), "203.0.113.1");
    const policy = response.headers.get("content-security-policy") ?? "";
    const body = await response.text();

    // The new number is in the page and in the graph.
    assertStringIncludes(body, "405-555-0100");

    // And every inline script the page actually emits is still admitted. This
    // is the test that catches the trap: the contact details live inside the
    // JSON-LD, so editing them changes the script the policy has to allow.
    const inline = [...body.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
      .map((match) => match[1] ?? "");
    assert(inline.length > 0);
    for (const script of inline) {
      assertStringIncludes(
        policy,
        await scriptHash(script),
        "the policy no longer admits the page",
      );
    }
  } finally {
    kv.close();
  }
});

Deno.test("nothing outside the four fields can be written", async () => {
  const { kv, contact } = await buildAdmin();
  try {
    await contact.save({
      email: "new@example.com",
      phone: "405-555-0100",
      phoneHref: "sms:+14055550100",
      phoneNote: "Text only",
      // deno-lint-ignore no-explicit-any
      ...({ tagline: "owned", email2: "x" } as any),
    });
    const stored = (await kv.get<Record<string, unknown>>(["content", "contact"])).value ?? {};
    assertEquals(Object.keys(stored).sort(), ["email", "phone", "phoneHref", "phoneNote"]);
  } finally {
    kv.close();
  }
});

Deno.test("with nothing overridden the site is exactly the committed one", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const { defaultContact } = await import("../src/content/site.ts");
    const store = await createContactStore(kv, ORIGIN);
    assertEquals(store.current(), defaultContact);
    assertEquals(store.overridden(), false);

    await store.save({
      email: "new@example.com",
      phone: "405-555-0100",
      phoneHref: "sms:+14055550100",
      phoneNote: "Text only",
    });
    assertEquals(store.overridden(), true);

    await store.reset();
    assertEquals(store.current(), defaultContact, "reset did not go back to the committed values");
    assertEquals(store.overridden(), false);
  } finally {
    kv.close();
  }
});
