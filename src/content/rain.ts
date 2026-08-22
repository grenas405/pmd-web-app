/**
 * rain.ts — the code that falls behind the page.
 *
 * The background animation streams these down its columns, a character at a
 * time, so reading down a column shows a real line from the stack rather than
 * noise. That is the entire reason it exists: the decoration makes the same
 * argument the rest of the page makes, which random glyphs could not.
 *
 * Which means these have to be true. They are condensed rather than quoted —
 * `Deno.serve` really is called across four lines in main.ts, not one — but every
 * identifier in them is real API from this repository, and
 * `tests/content_test.ts` fails the build if one drifts into plausible fiction.
 * A site that asks to be trusted on checkable claims does not get to put
 * invented API in its own wallpaper.
 *
 * Short, because a column shows twenty-odd characters at a time and a long line
 * never resolves into anything readable before it falls off the screen.
 */

export const snippets: readonly string[] = [
  'import { getCookies } from "@std/http/cookie"',
  'import { serveFile } from "@std/http/file-server"',
  'import { encodeHex } from "@std/encoding/hex"',
  'import { z } from "zod"',
  "const kv = await Deno.openKv(config.kvPath)",
  "Deno.serve({ port, hostname }, handler)",
  "export const ContactSchema = z.object({",
  "await kv.set(inquiryKey(record, id), record)",
  "return new Response(body, { status })",
  "assertEquals(response.status, 200)",
];

/** The longest a snippet may be before it stops resolving on screen. */
export const MAX_SNIPPET = 56;
