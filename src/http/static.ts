/**
 * static.ts — serve files from one directory and nowhere else.
 *
 * Path handling is the whole job. A request path is untrusted input that gets
 * turned into a filesystem path, which is exactly the shape of a directory
 * traversal bug, so resolution happens in a pure function that can be tested
 * against hostile input, and the result is re-checked after symlinks resolve.
 */

import { serveFile } from "@std/http/file-server";
import { isAbsolute, join, normalize, resolve, SEPARATOR } from "@std/path";
import { CACHE_ASSET, CACHE_SHORT } from "./respond.ts";

export type Resolution =
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly reason: "invalid" | "escape" };

/**
 * Map a URL path segment to an absolute filesystem path inside `root`.
 * Pure apart from `resolve`'s use of the current working directory.
 */
export function resolveStaticPath(root: string, requestPath: string): Resolution {
  let decoded: string;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  // A NUL byte can truncate a path inside a syscall; a backslash is a
  // separator on some platforms and a literal elsewhere. Neither belongs in a
  // URL for this site, so both are refused rather than interpreted.
  if (decoded.includes("\0") || decoded.includes("\\")) return { ok: false, reason: "invalid" };
  if (isAbsolute(decoded)) return { ok: false, reason: "escape" };

  const base = resolve(root);
  const candidate = normalize(join(base, decoded));
  if (candidate !== base && !candidate.startsWith(base + SEPARATOR)) {
    return { ok: false, reason: "escape" };
  }
  return { ok: true, path: candidate };
}

/** True when `path` is inside `root` after symlinks are resolved. */
async function staysInsideRoot(root: string, path: string): Promise<boolean> {
  try {
    const realRoot = await Deno.realPath(root);
    const realPath = await Deno.realPath(path);
    return realPath === realRoot || realPath.startsWith(realRoot + SEPARATOR);
  } catch {
    return false;
  }
}

export interface StaticResult {
  readonly response: Response;
  /** Set when the request was refused, for the caller to log. */
  readonly refused?: "invalid" | "escape" | "not-found";
}

/**
 * Serve `requestPath` from `root`. Files requested with a `?v=` fingerprint are
 * immutable by construction, so they get a one-year cache; everything else gets
 * an hour and revalidation. Range requests, ETags and 304s come from
 * `@std/http`, which already implements them correctly.
 */
export async function serveStatic(
  root: string,
  requestPath: string,
  request: Request,
  fingerprinted: boolean,
): Promise<StaticResult> {
  const resolution = resolveStaticPath(root, requestPath);
  if (!resolution.ok) {
    return { response: new Response(null, { status: 404 }), refused: resolution.reason };
  }

  let info: Deno.FileInfo;
  try {
    info = await Deno.stat(resolution.path);
  } catch {
    return { response: new Response(null, { status: 404 }), refused: "not-found" };
  }
  if (!info.isFile) {
    return { response: new Response(null, { status: 404 }), refused: "not-found" };
  }
  if (!await staysInsideRoot(root, resolution.path)) {
    return { response: new Response(null, { status: 404 }), refused: "escape" };
  }

  const response = await serveFile(request, resolution.path, { fileInfo: info });
  response.headers.set("cache-control", fingerprinted ? CACHE_ASSET : CACHE_SHORT);
  return { response };
}
