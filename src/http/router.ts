/**
 * router.ts — match a request to a handler. It decides nothing else.
 *
 * `matchRoutes` is pure: given a table and a request it returns a match, a
 * method mismatch (so the caller can answer 405 with a correct `Allow`), or
 * nothing. Dispatch, error handling and headers belong to the caller.
 */

export type Method = "GET" | "POST";

export interface RouteContext {
  readonly request: Request;
  readonly url: URL;
  readonly params: Readonly<Record<string, string>>;
  /** Identifier used for rate limiting and abuse logs, never for authority. */
  readonly client: string;
}

export type Handler = (context: RouteContext) => Response | Promise<Response>;

export interface Route {
  readonly method: Method;
  readonly pathname: string;
  readonly pattern: URLPattern;
  readonly handler: Handler;
}

export type Match =
  | { readonly kind: "match"; readonly route: Route; readonly params: Record<string, string> }
  | { readonly kind: "method-not-allowed"; readonly allowed: readonly string[] }
  | { readonly kind: "no-match" };

/** Declare a route. `pathname` is a URLPattern path, e.g. "/static/:path*". */
export function route(method: Method, pathname: string, handler: Handler): Route {
  return { method, pathname, pattern: new URLPattern({ pathname }), handler };
}

/**
 * Find the handler for a request.
 *
 * HEAD is matched against GET routes; the caller is responsible for dropping
 * the body. Anything else that matches a path but not a method produces a
 * method-not-allowed result rather than a 404, which is both correct and
 * avoids leaking which paths exist purely through status codes.
 */
export function matchRoutes(routes: readonly Route[], method: string, url: URL): Match {
  const wanted = method === "HEAD" ? "GET" : method;
  const allowed = new Set<string>();

  for (const candidate of routes) {
    const result = candidate.pattern.exec({ pathname: url.pathname });
    if (result === null) continue;
    allowed.add(candidate.method);
    if (candidate.method !== wanted) continue;

    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(result.pathname.groups)) {
      if (typeof value === "string") params[key] = value;
    }
    return { kind: "match", route: candidate, params };
  }

  if (allowed.size > 0) {
    const list = [...allowed];
    if (list.includes("GET")) list.push("HEAD");
    list.push("OPTIONS");
    return { kind: "method-not-allowed", allowed: list.sort() };
  }
  return { kind: "no-match" };
}

/** Methods this server will consider at all. Everything else is refused. */
export const SUPPORTED_METHODS: ReadonlySet<string> = new Set([
  "GET",
  "HEAD",
  "POST",
  "OPTIONS",
]);
