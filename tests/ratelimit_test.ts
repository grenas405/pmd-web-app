import { assert, assertEquals } from "@std/assert";
import { clientKey, createRateLimiter } from "../src/http/ratelimit.ts";

function fixedClock(start = 0) {
  let now = start;
  return { now: () => now, advance: (ms: number) => now += ms };
}

Deno.test("requests are allowed up to the limit and refused after it", () => {
  const clock = fixedClock();
  const limiter = createRateLimiter({ limit: 3, windowMs: 1000, now: clock.now });

  for (let i = 0; i < 3; i++) assert(limiter.check("a").allowed, `request ${i} should pass`);
  assertEquals(limiter.check("a").allowed, false);
});

Deno.test("a refusal reports a positive Retry-After", () => {
  const clock = fixedClock();
  const limiter = createRateLimiter({ limit: 1, windowMs: 10_000, now: clock.now });
  limiter.check("a");
  const decision = limiter.check("a");
  assertEquals(decision.allowed, false);
  assert(decision.retryAfterSeconds >= 1 && decision.retryAfterSeconds <= 10);
});

Deno.test("the window reopens once it has elapsed", () => {
  const clock = fixedClock();
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: clock.now });
  assert(limiter.check("a").allowed);
  assert(!limiter.check("a").allowed);
  clock.advance(1001);
  assert(limiter.check("a").allowed);
});

Deno.test("clients are counted separately", () => {
  const clock = fixedClock();
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: clock.now });
  assert(limiter.check("a").allowed);
  assert(limiter.check("b").allowed);
  assert(!limiter.check("a").allowed);
});

Deno.test("the key table stays bounded under a flood of unique clients", () => {
  const clock = fixedClock();
  const limiter = createRateLimiter({ limit: 5, windowMs: 60_000, now: clock.now, maxKeys: 50 });
  for (let i = 0; i < 5000; i++) limiter.check(`client-${i}`);
  assert(limiter.size() <= 50, `table grew to ${limiter.size()}`);
});

Deno.test("the forwarded address is used only when a proxy is trusted", () => {
  const request = new Request("https://example.test/", {
    headers: { "x-forwarded-for": "203.0.113.5, 198.51.100.9" },
  });
  assertEquals(clientKey(request, "10.0.0.1", false), "10.0.0.1");
  assertEquals(clientKey(request, "10.0.0.1", true), "203.0.113.5");
});

Deno.test("an absurd forwarded value falls back to the socket address", () => {
  const request = new Request("https://example.test/", {
    headers: { "x-forwarded-for": "x".repeat(200) },
  });
  assertEquals(clientKey(request, "10.0.0.1", true), "10.0.0.1");
});
