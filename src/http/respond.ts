/**
 * respond.ts — response constructors.
 *
 * Handlers return values built here so that content types, caching and the
 * shape of error bodies are decided once. Error responses never contain
 * exception messages, stack traces or filesystem paths; the detail goes to the
 * log, the client gets a status and a sentence.
 */

import { type Html, renderToString } from "../render/html.ts";

export const CACHE_NONE = "no-store";
export const CACHE_PAGE = "public, max-age=0, must-revalidate";
export const CACHE_ASSET = "public, max-age=31536000, immutable";
export const CACHE_SHORT = "public, max-age=3600";

export function htmlResponse(
  document: Html,
  init: { status?: number; cacheControl?: string } = {},
): Response {
  return new Response(renderToString(document), {
    status: init.status ?? 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": init.cacheControl ?? CACHE_PAGE,
    },
  });
}

export function jsonResponse(
  body: unknown,
  init: { status?: number } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": CACHE_NONE,
    },
  });
}

export function textResponse(
  body: string,
  init: { status?: number; contentType?: string; cacheControl?: string } = {},
): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      "content-type": init.contentType ?? "text/plain; charset=utf-8",
      "cache-control": init.cacheControl ?? CACHE_SHORT,
    },
  });
}

export function redirect(location: string, status: 301 | 302 | 303 | 307 | 308 = 303): Response {
  return new Response(null, { status, headers: { location } });
}

/** Public message for a status code. Deliberately uninformative. */
export function statusMessage(status: number): string {
  switch (status) {
    case 400:
      return "The request could not be understood.";
    case 403:
      return "That request was refused.";
    case 404:
      return "That page does not exist.";
    case 405:
      return "That method is not allowed here.";
    case 413:
      return "The request was too large.";
    case 415:
      return "That content type is not supported.";
    case 429:
      return "Too many requests. Please try again shortly.";
    default:
      return "Something went wrong on the server.";
  }
}

/** Does this client want JSON back? Used to answer fetch and forms alike. */
export function prefersJson(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("application/json")) return true;
  return !accept.includes("text/html") && request.headers.get("x-requested-with") === "fetch";
}
