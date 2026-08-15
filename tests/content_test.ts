/**
 * content_test.ts — the content modules are data, so they get data's tests:
 * shape, not prose. Nothing here asserts what the copy says, only that an edit
 * cannot leave the page rendering a blank row or a broken link.
 */

import { assert, assertEquals } from "@std/assert";
import { liveSites } from "../src/content/live.ts";
import { nav } from "../src/content/site.ts";
import {
  session,
  sessionPath,
  sessions,
  sessionSummary,
  subjects,
} from "../src/content/session.ts";

const KINDS = new Set(["prompt", "tool", "output", "summary"]);
const TOOLS = new Set(["Read", "Write", "Bash"]);

Deno.test("every session line is renderable", () => {
  assert(session.length > 0, "the hero would render an empty terminal");

  for (const line of sessions.flatMap((entry) => entry.lines)) {
    assert(KINDS.has(line.kind), `unknown kind: ${line.kind}`);
    assert(line.text.trim().length > 0, "a line with no text renders as a blank row");
    if (line.tool !== undefined) {
      assert(TOOLS.has(line.tool), `unknown tool: ${line.tool}`);
      assertEquals(line.kind, "tool", "only a tool line may carry a tool name");
    }
  }
});

Deno.test("every session opens with a prompt and closes with a summary", () => {
  // The animation types the first line and flourishes the last; both assume
  // this order, and neither would fail loudly if it changed.
  for (const { path, lines } of sessions) {
    assertEquals(lines[0]?.kind, "prompt", `${path} does not open with a prompt`);
    assertEquals(lines[lines.length - 1]?.kind, "summary", `${path} does not close with a summary`);

    const prompts = lines.filter((line) => line.kind === "prompt");
    assertEquals(prompts.length, 1, `${path}: session.js types exactly one prompt`);
  }
});

Deno.test("every session has the same shape as the one the server renders", () => {
  // session.js writes text onto the rows already in the DOM rather than
  // rebuilding the list, so a subject with a different row count — or a
  // different tool on row four — would blend half of one business with half of
  // another. sessionFor() makes that impossible; this makes it stay impossible.
  assert(sessions.length > 1, "there is nothing to rotate through");

  for (const { path, lines } of sessions) {
    assertEquals(lines.length, session.length, `${path} has a different number of rows`);
    lines.forEach((line, i) => {
      assertEquals(line.kind, session[i]?.kind, `${path} row ${i} has a different kind`);
      assertEquals(line.tool, session[i]?.tool, `${path} row ${i} has a different tool`);
    });
  }
});

Deno.test("the hero only names businesses that are actually live", () => {
  // The roster below the hero is checkable, which is the entire reason it is
  // worth anything. A subject whose host is not on that roster would be a
  // claim a visitor could disprove in one click.
  const hosts = new Set(liveSites.map((entry) => entry.host));

  for (const subject of subjects) {
    assert(
      hosts.has(subject.host),
      `${subject.business} deploys to ${subject.host}, which is not in live.ts`,
    );
    assert(subject.business.trim().length > 0);
    assert(subject.path.startsWith("~/"), `${subject.path} is not a home-relative path`);
    assert(subject.tests > 0);
  }
});

Deno.test("the session has a spoken alternative and a path", () => {
  assert(sessionSummary.trim().length > 0, "screen readers would hear nothing");
  assert(sessionPath.trim().length > 0);
});

Deno.test("every nav entry can fill a row of the menu", () => {
  assert(nav.length > 0);

  const indexes = new Set<string>();
  for (const link of nav) {
    assert(link.label.trim().length > 0);
    // The menu renders both of these; a blank one leaves a gap in the grid.
    assert(link.description.trim().length > 0, `${link.label} has no description`);
    assert(/^\d{2}$/.test(link.index), `${link.label} index is not zero-padded: ${link.index}`);

    assert(link.href.startsWith("#"), `${link.href} is not an in-page anchor`);
    assert(!indexes.has(link.index), `index ${link.index} is used twice`);
    indexes.add(link.index);
  }
});

Deno.test("live sites are unique, hostname-shaped and scheme-free", () => {
  assert(liveSites.length > 0);

  const hosts = new Set<string>();
  for (const entry of liveSites) {
    assert(entry.name.trim().length > 0);
    assert(entry.sector.trim().length > 0);

    // The template writes `https://${host}`, so a scheme here would produce
    // https://https://example.com and a link that goes nowhere.
    assert(!entry.host.includes("://"), `${entry.host} must not carry a scheme`);
    assert(/^[a-z0-9.-]+\.[a-z]{2,}$/.test(entry.host), `${entry.host} is not a hostname`);

    assert(!hosts.has(entry.host), `${entry.host} is listed twice`);
    hosts.add(entry.host);
  }
});
