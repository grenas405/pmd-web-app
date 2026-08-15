/**
 * projects.ts — the portfolio, as data.
 *
 * These are real engagements, both of them live and linked. Every claim here
 * should survive a reader clicking through and checking it, which is why
 * `href` must name a site on the roster in live.ts — a test enforces that.
 *
 * The copy is the client's story, not a technical write-up. What the software
 * does and what changed for the business belong here; how it is built gets one
 * short line at the end for the reader who wants it.
 *
 * NOTE FOR THE OWNER: the `problem` paragraphs describe the situation each
 * business was in. They are written from what the software addresses, not from
 * a transcript — check them with Roberto and with the pastor, and replace them
 * with what those two actually said. Putting words in a real client's mouth is
 * the one kind of claim this page cannot afford.
 */

export interface Project {
  /** URL-safe id, used for anchors and aria labels. */
  readonly slug: string;
  readonly name: string;
  /** One line under the title: the kind of business and the kind of software. */
  readonly summary: string;
  readonly year: string;
  readonly sector: string;
  /** The live site. Must be a host listed in live.ts. */
  readonly href: string;
  /** What the business was up against, in the owner's language. */
  readonly problem: string;
  /** What the software does for them now. */
  readonly built: string;
  /** What changed once it was running. */
  readonly outcome: readonly string[];
  /** The short "built with" line. Named, not explained. */
  readonly stack: readonly string[];
}

export const projects: readonly Project[] = [
  {
    slug: "heavenly-roofing",
    name: "Heavenly Roofing LLC",
    summary: "A roofing company's website, and the tools the office runs on behind it.",
    year: "2026",
    sector: "Roofing & storm restoration",
    href: "https://heavenlyroofingllc.com",
    problem:
      "Storm restoration in Oklahoma is a race. Hail falls on a Tuesday and the crews who reach " +
      "the door first get the work — which means knowing where the hail actually landed, getting " +
      "inspections on the calendar while the phone is still ringing, and keeping every partner " +
      "conversation straight at the same time. Held on a phone and in memory, that is a lot to " +
      "carry through a busy week.",
    built:
      "A website that books a free roof inspection without anyone waiting for a callback, and an " +
      "office side that does the rest. A storm map shows where hail actually fell, with radar " +
      "history and a canvassing layer, so a crew works a map instead of a list. Appointments land " +
      "on a dashboard. A follow-up board keeps every partner conversation in one place, with " +
      "message templates in English and Spanish and one-click drafts, so nobody is chased twice " +
      "or quietly forgotten.",
    outcome: [
      "Inspections booked from the website instead of a game of phone tag",
      "Storm work planned from a map of where the hail really fell",
      "Every follow-up in one place, in whichever language the conversation happens",
      "The owner updates his own slogans, photos and contact details",
    ],
    stack: ["Deno", "Leaflet", "Deno KV", "Nginx"],
  },
  {
    slug: "mercy-seat-ministries",
    name: "Mercy Seat Ministries",
    summary: "A church's whole week online, and a prayer wall the congregation actually uses.",
    year: "2026",
    sector: "Church",
    href: "https://msmokc.org",
    problem:
      "A church's week is full — Sunday school, worship, praise and prayer, Friday Bible study — " +
      "and none of it helps somebody who cannot find out when to turn up. Service times spread " +
      "across social posts are easy to miss and hard to search, and between Sundays there was " +
      "nowhere for the congregation to ask for prayer or to hear that one had been answered.",
    built: "Eleven pages covering service times, ministries, Sunday school, Friday Bible study, " +
      "devotionals, giving and contact — so a visitor new to the city can find the door. A " +
      "prayer wall lets anyone post a request, tap to say they prayed for it, and watch answered " +
      "requests move to a list of testimonies. The pastor signs in to post study links and look " +
      "after the wall himself, without calling anyone.",
    outcome: [
      "Service times findable without opening a social feed",
      "Prayer requests shared and prayed over between Sundays",
      "Answered prayers kept where the congregation can read them",
      "The pastor updates the site himself; no developer in the loop",
    ],
    stack: ["Deno", "JSR @std/http", "Zod", "Deno KV"],
  },
];
