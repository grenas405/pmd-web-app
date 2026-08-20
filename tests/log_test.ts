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

Deno.test("errors keep name, message and stack — the journal is private", () => {
  const line = formatEvent("error", "boom", { error: new Error("disk full") }, new Date());
  const parsed = JSON.parse(line);
  assertEquals(parsed.error.name, "Error");
  assertEquals(parsed.error.message, "disk full");
  assert(Array.isArray(parsed.error.stack), "the stack is what makes the line useful");
  assert(parsed.error.stack.length > 0, "a thrown Error always has at least one frame");
  assert(
    parsed.error.stack[0].startsWith("at "),
    `the first frame is the throw site, got ${parsed.error.stack[0]}`,
  );
});

Deno.test("a stack is trimmed to a readable number of frames", () => {
  // Deep enough that an untrimmed stack would run well past the cap.
  const deep = (depth: number): Error => depth === 0 ? new Error("bottom") : deep(depth - 1);
  const parsed = JSON.parse(formatEvent("error", "boom", { error: deep(40) }, new Date()));
  assert(parsed.error.stack.length <= 8, `got ${parsed.error.stack.length} frames`);
});

Deno.test("an error message cannot forge a second log line", () => {
  const forged = new Error('legit"}\n{"level":"info","msg":"all clear');
  const line = formatEvent("error", "boom", { error: forged }, new Date());
  assertEquals(line.split("\n").length, 1, "one event is one line");
  // The newline survives as a space, so nothing is silently swallowed either.
  assert(JSON.parse(line).error.message.includes("all clear"));
});

Deno.test("a cause is flattened, so a cycle cannot hang the logger", () => {
  const inner = new Error("readonly database");
  const outer = new Error("could not store enquiry", { cause: inner });
  inner.cause = outer;
  const parsed = JSON.parse(formatEvent("error", "boom", { error: outer }, new Date()));
  assertEquals(parsed.error.cause, "Error: readonly database");
});

Deno.test("undefined fields are dropped rather than serialised", () => {
  assertEquals(sanitizeFields({ a: undefined, b: 1 }), { b: 1 });
});
