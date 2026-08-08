import { assert, assertEquals } from "@std/assert";
import { matchRoutes, route, SUPPORTED_METHODS } from "../src/http/router.ts";

const ok = () => new Response("ok");

const routes = [
  route("GET", "/", ok),
  route("POST", "/api/contact", ok),
  route("GET", "/static/:path*", ok),
];

const url = (path: string) => new URL(path, "https://example.test");

Deno.test("an exact path and method matches", () => {
  const match = matchRoutes(routes, "GET", url("/"));
  assertEquals(match.kind, "match");
});

Deno.test("wildcard segments are captured as params", () => {
  const match = matchRoutes(routes, "GET", url("/static/css/site.css"));
  assert(match.kind === "match");
  assertEquals(match.params.path, "css/site.css");
});

Deno.test("HEAD is served by the GET route", () => {
  const match = matchRoutes(routes, "HEAD", url("/"));
  assert(match.kind === "match");
  assertEquals(match.route.method, "GET");
});

Deno.test("a known path with the wrong method reports what is allowed", () => {
  const match = matchRoutes(routes, "GET", url("/api/contact"));
  assert(match.kind === "method-not-allowed");
  assertEquals(match.allowed, ["OPTIONS", "POST"]);
});

Deno.test("GET routes advertise HEAD and OPTIONS alongside GET", () => {
  const match = matchRoutes(routes, "POST", url("/"));
  assert(match.kind === "method-not-allowed");
  assertEquals(match.allowed, ["GET", "HEAD", "OPTIONS"]);
});

Deno.test("an unknown path matches nothing", () => {
  assertEquals(matchRoutes(routes, "GET", url("/nope")).kind, "no-match");
});

Deno.test("only the four methods this server implements are supported", () => {
  assertEquals([...SUPPORTED_METHODS].sort(), ["GET", "HEAD", "OPTIONS", "POST"]);
  for (const method of ["PUT", "DELETE", "PATCH", "TRACE", "CONNECT"]) {
    assert(!SUPPORTED_METHODS.has(method), `${method} must not be supported`);
  }
});
