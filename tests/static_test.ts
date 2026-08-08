/**
 * Path resolution is where a static file server gets broken into. These cases
 * are the ones an attacker tries first.
 */

import { assert, assertEquals } from "@std/assert";
import { resolve } from "@std/path";
import { resolveStaticPath } from "../src/http/static.ts";

const ROOT = "static";

function reason(path: string): string {
  const result = resolveStaticPath(ROOT, path);
  return result.ok ? "allowed" : result.reason;
}

Deno.test("ordinary paths resolve inside the root", () => {
  const result = resolveStaticPath(ROOT, "css/site.css");
  assert(result.ok);
  assertEquals(result.path, resolve(ROOT, "css/site.css"));
});

Deno.test("directory traversal is refused in every encoding", () => {
  assertEquals(reason("../deno.json"), "escape");
  assertEquals(reason("../../etc/passwd"), "escape");
  assertEquals(reason("css/../../deno.json"), "escape");
  assertEquals(reason("%2e%2e/deno.json"), "escape");
  assertEquals(reason("%2e%2e%2f%2e%2e%2fetc%2fpasswd"), "escape");
});

Deno.test("absolute paths never reach the filesystem", () => {
  assertEquals(reason("/etc/passwd"), "escape");
  assertEquals(reason("%2Fetc%2Fpasswd"), "escape");
});

Deno.test("NUL bytes and backslashes are refused rather than interpreted", () => {
  assertEquals(reason("css/site.css%00.png"), "invalid");
  assertEquals(reason("..\\deno.json"), "invalid");
});

Deno.test("malformed percent-encoding is refused, not repaired", () => {
  assertEquals(reason("%"), "invalid");
  assertEquals(reason("%zz"), "invalid");
});

Deno.test("a path that merely starts with the root name does not escape it", () => {
  // "static-secrets" shares a prefix with "static" but is a different tree.
  const result = resolveStaticPath(ROOT, "../static-secrets/key.txt");
  assert(!result.ok);
  assertEquals(result.reason, "escape");
});

Deno.test("nested paths inside the root are allowed", () => {
  assertEquals(reason("img/../css/site.css"), "allowed");
  assertEquals(reason("vendor/anime.es.js"), "allowed");
});

Deno.test("dot-heavy names that are not traversal stay inside the root", () => {
  // "...." is a legal directory name, not a parent reference. It resolves
  // inside the root and simply will not exist, which is a 404, not a refusal.
  const result = resolveStaticPath(ROOT, "....//deno.json");
  assert(result.ok);
  assert(result.path.startsWith(resolve(ROOT)));
});
