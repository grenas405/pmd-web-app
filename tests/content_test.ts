/**
 * content_test.ts — the content modules are data, so they get data's tests:
 * shape, not prose. Nothing here asserts what the copy says, only that an edit
 * cannot leave the page rendering a blank row or a broken link.
 */

import { assert, assertEquals } from "@std/assert";
import { liveSites } from "../src/content/live.ts";
import { projects } from "../src/content/projects.ts";
import { faq } from "../src/content/faq.ts";
import { comparison, included, notIncluded, plan, sources } from "../src/content/pricing.ts";
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

    // Every destination is rooted at the site, never bare. A bare `#contact`
    // is relative to whatever page is being read, so on /pricing it resolved
    // to /pricing#contact and went nowhere — the menu is in the layout and
    // therefore renders on every page, so it cannot assume it is on the
    // landing page.
    assert(link.href.startsWith("/"), `${link.href} is not rooted at the site`);
    assert(!link.href.startsWith("//"), `${link.href} is protocol-relative, not a site path`);
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

Deno.test("the pricing arithmetic on the page adds up", () => {
  // The page prints all three of these. If the first year ever stops being the
  // build plus twelve months of care, the copy is lying to a customer.
  assertEquals(plan.build, 295);
  assertEquals(plan.care, 20);
  assertEquals(plan.termMonths, 12);
  assertEquals(plan.firstYear, 535);
  assertEquals(plan.firstYear, plan.build + plan.care * plan.termMonths);
  assertEquals(plan.perYearAfter, 240);
});

Deno.test("every comparison figure names a source that exists", () => {
  assert(comparison.length > 0);
  for (const row of comparison) {
    assert(row.label.trim().length > 0);
    assert(row.typical.trim().length > 0);
    assert(row.here.trim().length > 0);
    // A footnote marker pointing at nothing is worse than no footnote: the
    // claim would read as sourced while being unattributable.
    assert(
      row.source >= 0 && row.source < sources.length,
      `${row.label} cites source ${row.source}, which does not exist`,
    );
  }

  for (const source of sources) {
    assert(source.url.startsWith("https://"), `${source.label} is not an https source`);
    assert(source.note.trim().length > 0, `${source.label} has no note saying what it supports`);
  }
});

Deno.test("what is and is not included are both stated", () => {
  assert(included.length > 0);
  assert(notIncluded.length > 0, "a price with no exclusions listed is a price with surprises");
  for (const item of [...included, ...notIncluded]) assert(item.trim().length > 0);
});

Deno.test("every FAQ entry is a real question with a real answer", () => {
  assert(faq.length >= 6, "fewer than six answers is not an FAQ, it is a hint");

  const asked = new Set<string>();
  for (const entry of faq) {
    assert(entry.question.trim().endsWith("?"), `not a question: ${entry.question}`);
    // These become FAQPage answers in search results, where they appear alone.
    assert(entry.answer.trim().length > 40, `${entry.question} has a stub for an answer`);
    assert(!asked.has(entry.question), `asked twice: ${entry.question}`);
    asked.add(entry.question);
  }
});

Deno.test("every case study is complete enough to render", () => {
  assert(projects.length > 0, "the work section would be empty");

  const slugs = new Set<string>();
  for (const project of projects) {
    for (
      const [field, value] of [
        ["name", project.name],
        ["summary", project.summary],
        ["year", project.year],
        ["sector", project.sector],
        ["problem", project.problem],
        ["built", project.built],
      ] as const
    ) {
      assert(value.trim().length > 0, `${project.slug} has no ${field}`);
    }

    assert(project.outcome.length > 0, `${project.slug} claims nothing changed`);
    assert(project.stack.length > 0, `${project.slug} lists nothing it was built with`);
    for (const line of [...project.outcome, ...project.stack]) {
      assert(line.trim().length > 0, `${project.slug} has a blank list entry`);
    }

    // The slug becomes a DOM id and an aria-labelledby target.
    assert(/^[a-z0-9-]+$/.test(project.slug), `${project.slug} is not URL-safe`);
    assert(!slugs.has(project.slug), `${project.slug} is used twice`);
    slugs.add(project.slug);
  }
});

Deno.test("every case study links to a site we actually run", () => {
  // The same rule that binds the hero rotation to real hosts. A case study
  // pointing somewhere we do not run is a claim a visitor disproves in one
  // click, which is worse than having no case study at all.
  const hosts = new Set(liveSites.map((entry) => entry.host));

  for (const project of projects) {
    const url = new URL(project.href);
    assertEquals(url.protocol, "https:", `${project.slug} does not link over https`);
    assert(
      hosts.has(url.hostname),
      `${project.name} links to ${url.hostname}, which is not on the roster in live.ts`,
    );
  }
});
