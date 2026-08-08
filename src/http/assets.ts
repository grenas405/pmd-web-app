/**
 * assets.ts — content-hash every static file once, at startup.
 *
 * Pages link to `/static/css/site.css?v=9f2c…`, so a changed file gets a new
 * URL and an unchanged one can be cached forever. The alternative — guessing
 * at max-age values — is how sites end up serving last month's stylesheet.
 */

import { encodeHex } from "@std/encoding/hex";
import { join, relative, SEPARATOR } from "@std/path";

export interface AssetIndex {
  /** "/css/site.css" -> "9f2c1a0b4d7e" */
  readonly hashes: ReadonlyMap<string, string>;
  /** Public URL including the cache-busting query. */
  readonly url: (path: string) => string;
}

async function hashFile(path: string): Promise<string> {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return encodeHex(new Uint8Array(digest)).slice(0, 12);
}

/** Walk `root` and hash every file. Called once during startup. */
export async function indexAssets(root: string): Promise<AssetIndex> {
  const hashes = new Map<string, string>();

  async function walk(directory: string): Promise<void> {
    for await (const entry of Deno.readDir(directory)) {
      const path = join(directory, entry.name);
      if (entry.isDirectory) {
        await walk(path);
      } else if (entry.isFile) {
        const key = "/" + relative(root, path).split(SEPARATOR).join("/");
        hashes.set(key, await hashFile(path));
      }
    }
  }

  await walk(root);

  return Object.freeze({
    hashes,
    url: (path: string): string => {
      const version = hashes.get(path);
      return version === undefined ? `/static${path}` : `/static${path}?v=${version}`;
    },
  });
}
