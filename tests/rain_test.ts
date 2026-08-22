/**
 * The background rain claims to show the stack these sites are built on. This
 * keeps that true.
 *
 * The check is the imports at the top of this file, not an assertion in the
 * body: every symbol the snippets name is imported here from the place they say
 * it comes from, so a specifier that stops existing or a symbol that was never
 * exported fails `deno check` before any test runs. Reading the source tree
 * would have needed wider permissions and proved less.
 */

import { assert, assertEquals } from "@std/assert";
import { getCookies } from "@std/http/cookie";
import { serveFile } from "@std/http/file-server";
import { encodeHex } from "@std/encoding/hex";
import { z } from "zod";
import { ContactSchema } from "../src/contact/message.ts";
import { inquiryKey } from "../src/contact/store.ts";
import { MAX_SNIPPET, snippets } from "../src/content/rain.ts";

Deno.test("every symbol the rain names is one this codebase can import", () => {
  // Named so the imports above are used rather than decorative, and so the
  // failure reads as "the rain mentions something that is not real".
  const real: Record<string, unknown> = {
    getCookies,
    serveFile,
    encodeHex,
    ContactSchema,
    inquiryKey,
    "z.object": z.object,
    "Deno.openKv": Deno.openKv,
    "Deno.serve": Deno.serve,
  };

  for (const [name, value] of Object.entries(real)) {
    assert(value !== undefined, `${name} is named in the rain but does not exist`);
    assert(
      snippets.some((line) => line.includes(name.split(".").pop() ?? name)),
      `${name} is imported here to vouch for the rain but no snippet uses it`,
    );
  }
});

Deno.test("no snippet is longer than a column can resolve", () => {
  // A column shows twenty-odd characters at a time. A long line never resolves
  // into anything readable before it falls off the screen, which turns code
  // back into the confetti this was written to avoid.
  for (const line of snippets) {
    assert(line.trim().length > 0, "an empty snippet would draw nothing");
    assert(
      line.length <= MAX_SNIPPET,
      `"${line}" is ${line.length} characters, past the ${MAX_SNIPPET} a column can show`,
    );
  }
});

Deno.test("the snippets are distinct", () => {
  // Duplicates waste columns: two of them would show the same line at once,
  // which reads as a rendering fault rather than as variety.
  assertEquals(new Set(snippets).size, snippets.length);
});
