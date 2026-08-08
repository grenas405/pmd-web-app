/**
 * narrative.ts — the argument the page makes, as data.
 *
 * Each section of the site answers one question. Keeping the answers here as
 * plain arrays means the page renderer stays a layout concern and the copy
 * stays an editorial one.
 */

export interface Translation {
  /** The engineering decision. */
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

/** "Why does this architecture matter to businesses?" */
export const translations: readonly Translation[] = [
  {
    decision: "Simple architecture",
    consequence:
      "Software you can still change in year three. A system small enough to hold in your head " +
      "is a system that can be fixed the day it breaks, by whoever is holding it.",
  },
  {
    decision: "Local-first design",
    consequence:
      "Work continues when the connection does not. Trucks in rural Oklahoma, a shop with flaky " +
      "wifi, an office during an outage — the application keeps taking input and reconciles later.",
  },
  {
    decision: "Minimal dependencies",
    consequence:
      "A smaller attack surface and less debt. Every package you do not install is a supply " +
      "chain you do not have to audit and an upgrade you never have to schedule.",
  },
  {
    decision: "Explicit permissions",
    consequence:
      "The server can only do what it was granted. Deno starts with no access to your disk, " +
      "network or environment; each capability is written down where it can be reviewed.",
  },
  {
    decision: "AI-augmented delivery",
    consequence:
      "Agency-level pace with one phone number. Review, refactoring and test scaffolding move " +
      "quickly — while the person who wrote your system is the person who answers the call.",
  },
  {
    decision: "Standards, not frameworks",
    consequence:
      "Nothing to migrate off later. Requests, responses, URLs and forms are Web Platform " +
      "primitives, so your software does not expire alongside a framework's release cycle.",
  },
];

/** "Who is Pedro / what does he build?" */
export const capabilities: readonly Capability[] = [
  {
    title: "Line-of-business applications",
    body: "Scheduling, intake, dispatch, inventory, invoicing — the internal software a company " +
      "actually runs on, built around how the work is really done rather than how a product " +
      "category thinks it should be.",
  },
  {
    title: "Systems that survive bad networks",
    body: "Field tools that stay usable at the edge of coverage, capture work locally, and " +
      "reconcile cleanly. The device is treated as authoritative; the server reconciles.",
  },
  {
    title: "Security as architecture",
    body:
      "Validation at the boundary, strict Content-Security-Policy, least-privilege processes, " +
      "safe error handling. OWASP guidance shapes the design instead of arriving as a punch " +
      "list after launch.",
  },
  {
    title: "Deployment and stewardship",
    body: "Ubuntu LTS, Nginx, systemd, backups you can verify. Software delivered as a running " +
      "service on infrastructure you own, documented well enough that you are never captive.",
  },
];

/** "How can an Oklahoma City business work with him?" */
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
    title: "Smallest useful system",
    duration: "Week 1",
    body:
      "A written proposal for the smallest thing that removes the biggest daily friction, with " +
      "a fixed price and a date. Not a platform. The part that pays for itself first.",
  },
  {
    index: "03",
    title: "Build in the open",
    duration: "Weeks 2–5",
    body:
      "Working software on a staging URL from the first week, updated continuously. You use it " +
      "while it is being built, and course corrections happen while they are still cheap.",
  },
  {
    index: "04",
    title: "Deploy and hand over the keys",
    duration: "Launch",
    body: "Deployed to infrastructure in your name, with documentation, backups and the source. " +
      "Ongoing support is a choice you keep making, not a lock-in you signed.",
  },
];

/** "How can one developer compete with an agency?" — headline comparisons. */
export const advantage: readonly Translation[] = [
  {
    decision: "No handoff loss",
    consequence:
      "The person in your discovery meeting is the person writing the code and the person " +
      "answering at 7pm when something looks wrong. Nothing is lost between an account " +
      "manager, a designer, an offshore team and a maintenance contract.",
  },
  {
    decision: "No stack tax",
    consequence:
      "An agency's estimate carries the weight of its standard stack — the build pipeline, the " +
      "framework upgrade, the dependency audit. A small architecture removes that line item " +
      "from the bid and from every year that follows.",
  },
  {
    decision: "Iteration at machine speed",
    consequence:
      "AI-assisted development compresses the mechanical parts of the work: scaffolding, tests, " +
      "refactors, review passes. Judgment stays human; typing stops being the bottleneck.",
  },
];
