/**
 * narrative.ts — the argument the page makes, as data.
 *
 * Each section of the site answers one question. Keeping the answers here as
 * plain arrays means the page renderer stays a layout concern and the copy
 * stays an editorial one.
 *
 * The audience is a business owner, not an engineer. Every `decision` below is
 * written the way it would be said across a counter; the engineering that
 * backs it up is in the source, one click away, for the reader who wants it.
 */

export interface Translation {
  /** The decision, in the words a customer would use. */
  readonly decision: string;
  /** What it means for a business that has to live with the software. */
  readonly consequence: string;
}

export interface Capability {
  readonly title: string;
  readonly body: string;
}

export interface Step {
  readonly index: string;
  readonly title: string;
  readonly body: string;
  readonly duration: string;
}

/** "Why does any of this matter to my business?" */
export const translations: readonly Translation[] = [
  {
    decision: "Built small on purpose",
    consequence:
      "Software you can still change in year three. A system small enough to hold in one head " +
      "is a system that gets fixed the day it breaks, instead of the quarter it breaks.",
  },
  {
    decision: "Keeps working when the internet does not",
    consequence:
      "Trucks in rural Oklahoma, a shop with bad wifi, an office in an outage. The app keeps " +
      "taking information and catches up on its own once the signal comes back.",
  },
  {
    decision: "Almost nothing borrowed from strangers",
    consequence:
      "Most web software is assembled from hundreds of packages written by people nobody has " +
      "met. Each one is a way in and a thing to update. Yours has a handful, chosen on purpose.",
  },
  {
    decision: "Locked down by default",
    consequence:
      "The server starts with permission to do nothing — not to read your files, not to reach " +
      "the internet — and gets back only what the job needs, written down where it can be read.",
  },
  {
    decision: "AI does the typing. I do the judgment.",
    consequence:
      "Claude Code and Codex handle the mechanical half — scaffolding, tests, the tedious " +
      "refactor — so one engineer moves at the speed of a team. What to build, and whether it " +
      "is right, stays a human decision and stays mine.",
  },
  {
    decision: "Nothing to migrate off later",
    consequence:
      "No framework to be abandoned in three years and no rebuild to pay for when it is. This " +
      "is built on the web itself, which has never had a breaking release.",
  },
];

/** "What can he actually do for me?" */
export const capabilities: readonly Capability[] = [
  {
    title: "Websites that bring in work",
    body: "A site that loads instantly on a phone in a parking lot, says what you do, and makes " +
      "it easy to call you. Fast because it is small — not because it was optimised afterwards.",
  },
  {
    title: "Quotes, bookings and intake",
    body: "The form that turns a visitor into a job on your calendar, wired to your inbox and " +
      "checked hard enough that spam and half-filled requests never reach you.",
  },
  {
    title: "The software you run the business on",
    body: "Scheduling, dispatch, inventory, invoicing — built around how the work is really " +
      "done, including the paper and the whiteboard and the spreadsheet everyone maintains.",
  },
  {
    title: "Hosting, on infrastructure you choose",
    body: "A Contabo VPS, Deno Deploy, or a server already in your name — the same software " +
      "runs on any of them. You own the accounts, you hold the source, and you are never " +
      "captive to me. Backups, certificates and updates are handled.",
  },
];

/** "How would working together actually go?" */
export const process: readonly Step[] = [
  {
    index: "01",
    title: "Sit down at your counter",
    duration: "Free",
    body:
      "An hour watching how the work moves today — the paper, the whiteboard, the spreadsheet " +
      "everyone quietly maintains. Most of the design is already there.",
  },
  {
    index: "02",
    title: "The smallest useful thing",
    duration: "Week 1",
    body: "A written proposal for the one change that removes the biggest daily friction, with a " +
      "fixed price and a date. Not a platform. The part that pays for itself first.",
  },
  {
    index: "03",
    title: "Watch it get built",
    duration: "Weeks 2–5",
    body:
      "Working software at a real web address from the first week, updated as it goes. You use " +
      "it while it is being built, so corrections happen while they are still cheap.",
  },
  {
    index: "04",
    title: "Launch, and hand over the keys",
    duration: "Launch",
    body: "Live on hosting in your name, with the source, the documentation and the backups. " +
      "Ongoing support is a choice you keep making, not a contract you signed once.",
  },
];

/** "Why one person instead of an agency?" */
export const advantage: readonly Translation[] = [
  {
    decision: "One person, several businesses",
    consequence:
      "The sites listed below run day and night on one small server, maintained by one engineer. " +
      "That is only possible because each one is small, boring and built the same way — and it " +
      "is why a project here does not carry the overhead of a firm.",
  },
  {
    decision: "Nothing lost in the handoff",
    consequence:
      "The person in your first meeting is the person writing the code and the person answering " +
      "at 7pm when something looks wrong. No account manager, no offshore team, no ticket queue " +
      "between you and the person who can fix it.",
  },
  {
    decision: "You are not paying for the machinery",
    consequence:
      "An agency's price carries its standard toolkit — the build pipeline, the yearly framework " +
      "upgrade, the security audit of code nobody there wrote. Take that away and the same " +
      "working software costs less to build and far less to keep.",
  },
];
