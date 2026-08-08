import { assert, assertEquals } from "@std/assert";
import { formatEvent, sanitizeFields, sanitizeValue } from "../src/log.ts";

Deno.test("a log line is one line, whatever the input contains", () => {
  const line = formatEvent(
    "info",
    "request",
    { path: "/a\nlevel=error msg=forged" },
    new Date("2026-01-02T03:04:05Z"),
  );
  assertEquals(line.split("\n").length, 1);
  const parsed = JSON.parse(line);
  assertEquals(parsed.level, "info");
  assert(!parsed.path.includes("\n"), "a newline would let a client forge a log entry");
});

Deno.test("terminal escape sequences are flattened", () => {
  assertEquals(sanitizeValue("\u001b[31mred\u001b[0m"), " [31mred [0m");
});

Deno.test("secret-looking keys are redacted by name", () => {
  const safe = sanitizeFields({
    authorization: "Bearer abc",
    apiKey: "xyz",
    sessionToken: "s",
    cookie: "a=b",
    password: "hunter2",
    company: "Reed Auto",
  });
  for (const key of ["authorization", "apiKey", "sessionToken", "cookie", "password"]) {
    assertEquals(safe[key], "[redacted]", `${key} was not redacted`);
  }
  assertEquals(safe.company, "Reed Auto");
});

Deno.test("long values are truncated so one request cannot flood the log", () => {
  const value = sanitizeValue("x".repeat(5000));
  assert(typeof value === "string" && value.length <= 513);
});

Deno.test("errors are reduced to their message, never their stack", () => {
  const line = formatEvent("error", "boom", { error: new Error("disk full") }, new Date());
  const parsed = JSON.parse(line);
  assertEquals(parsed.error, "disk full");
  assert(!line.includes("at "), "stack frames must not be logged");
});

Deno.test("undefined fields are dropped rather than serialised", () => {
  assertEquals(sanitizeFields({ a: undefined, b: 1 }), { b: 1 });
});
