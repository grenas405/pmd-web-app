import { assert, assertEquals, assertThrows } from "@std/assert";
import { allowedOrigins, parseConfig } from "../src/config.ts";

Deno.test("an empty environment yields safe defaults", () => {
  const config = parseConfig({});
  assertEquals(config.hostname, "127.0.0.1", "the default bind must be loopback");
  assertEquals(config.port, 8002);
  assertEquals(config.env, "development");
  assertEquals(config.hsts, false);
  assertEquals(config.trustProxy, false, "a proxy must be opted into, never assumed");
  assertEquals(config.trustedOrigins, []);
});

Deno.test("values are coerced from their string forms", () => {
  const config = parseConfig({
    PORT: "9000",
    ENABLE_HSTS: "true",
    TRUST_PROXY: "1",
    CONTACT_RATE_LIMIT: "12",
    APP_ENV: "production",
  });
  assertEquals(config.port, 9000);
  assertEquals(config.hsts, true);
  assertEquals(config.trustProxy, true);
  assertEquals(config.contactRateLimit, 12);
  assertEquals(config.env, "production");
});

Deno.test("a malformed environment fails at startup rather than at runtime", () => {
  assertThrows(() => parseConfig({ PORT: "70000" }));
  assertThrows(() => parseConfig({ PORT: "not-a-port" }));
  assertThrows(() => parseConfig({ PUBLIC_ORIGIN: "javascript:alert(1)" }));
  assertThrows(() => parseConfig({ PUBLIC_ORIGIN: "not a url" }));
  assertThrows(() => parseConfig({ APP_ENV: "staging" }));
  assertThrows(() => parseConfig({ TRUSTED_ORIGINS: "https://ok.test,nonsense" }));
});

Deno.test("the configuration object cannot be mutated after it is read", () => {
  const config = parseConfig({});
  assert(Object.isFrozen(config));
});

Deno.test("trusted origins are parsed from a comma-separated list", () => {
  const config = parseConfig({
    PUBLIC_ORIGIN: "https://pedromdominguez.dev",
    TRUSTED_ORIGINS: "https://staging.pedromdominguez.dev, https://www.pedromdominguez.dev",
  });
  assertEquals(config.trustedOrigins.length, 2);

  const origins = allowedOrigins(config);
  assert(origins.has("https://pedromdominguez.dev"));
  assert(origins.has("https://staging.pedromdominguez.dev"));
  assert(!origins.has("https://evil.example"));
});
