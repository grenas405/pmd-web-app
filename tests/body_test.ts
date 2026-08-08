import { assert, assertEquals } from "@std/assert";
import { MAX_FORM_BYTES, parseSubmission, readLimitedText } from "../src/http/body.ts";

function post(body: BodyInit, headers: Record<string, string> = {}): Request {
  return new Request("https://example.test/api/contact", { method: "POST", body, headers });
}

Deno.test("a body within the limit is read whole", async () => {
  const result = await readLimitedText(post("name=Dana"), MAX_FORM_BYTES);
  assert(result.ok);
  assertEquals(result.text, "name=Dana");
});

Deno.test("a body over the limit is refused", async () => {
  const result = await readLimitedText(post("x".repeat(200)), 100);
  assert(!result.ok);
  assertEquals(result.reason, "too-large");
});

Deno.test("a lying Content-Length does not get past the counter", async () => {
  // The stream is longer than the header claims; the count decides.
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(500)));
      controller.close();
    },
  });
  const request = new Request("https://example.test/api/contact", {
    method: "POST",
    body: stream,
    headers: { "content-length": "10" },
  });
  const result = await readLimitedText(request, 100);
  assert(!result.ok);
  assertEquals(result.reason, "too-large");
});

Deno.test("invalid UTF-8 is refused rather than replaced", async () => {
  const request = new Request("https://example.test/api/contact", {
    method: "POST",
    body: new Uint8Array([0xff, 0xfe, 0xfd]),
  });
  const result = await readLimitedText(request, 100);
  assert(!result.ok);
  assertEquals(result.reason, "unreadable");
});

Deno.test("urlencoded bodies become a flat map, first value winning", () => {
  const fields = parseSubmission("application/x-www-form-urlencoded", "a=1&b=2&a=3");
  assertEquals(fields, { a: "1", b: "2" });
});

Deno.test("JSON objects of strings are accepted", () => {
  assertEquals(parseSubmission("application/json", '{"a":"1"}'), { a: "1" });
});

Deno.test("anything other than a flat JSON object of strings is refused", () => {
  assertEquals(parseSubmission("application/json", "[1,2]"), null);
  assertEquals(parseSubmission("application/json", '{"a":{"b":"c"}}'), null);
  assertEquals(parseSubmission("application/json", '{"a":1}'), null);
  assertEquals(parseSubmission("application/json", "not json"), null);
  assertEquals(parseSubmission("application/json", "null"), null);
});

Deno.test("unknown content types are refused, never guessed at", () => {
  assertEquals(parseSubmission("text/plain", "a=1"), null);
  assertEquals(parseSubmission("multipart/form-data", "a=1"), null);
  assertEquals(parseSubmission("", "a=1"), null);
});

Deno.test("prototype pollution attempts stay ordinary keys", () => {
  const fields = parseSubmission("application/json", '{"__proto__":"x"}');
  assert(fields !== null);
  assertEquals(({} as Record<string, unknown>).polluted, undefined);
});
