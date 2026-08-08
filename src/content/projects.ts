/**
 * projects.ts — the portfolio, as data.
 *
 * Each entry answers the same six questions in the same order, because that is
 * the order a business owner asks them: what hurt, what got built, how it is
 * put together, what it is made of, why that way, and what changed afterwards.
 *
 * NOTE FOR THE OWNER: replace these entries with your real engagements. Keep
 * the shape; the page renders whatever is in this array.
 */

export interface Project {
  /** URL-safe id, used for anchors and aria labels. */
  readonly slug: string;
  readonly name: string;
  /** One line under the title: the kind of business and the kind of software. */
  readonly summary: string;
  readonly year: string;
  readonly sector: string;
  /** The business problem, in the owner's language. */
  readonly problem: string;
  /** What was delivered. */
  readonly built: string;
  /** How it is put together, in one paragraph. */
  readonly architecture: string;
  /** Why this shape and not another. */
  readonly rationale: string;
  readonly stack: readonly string[];
  /** Measured or observed result. */
  readonly outcome: readonly string[];
}

export const projects: readonly Project[] = [
  {
    slug: "route-ledger",
    name: "Route Ledger",
    summary: "Delivery logging for a regional distributor whose drivers lose signal every day.",
    year: "2025",
    sector: "Distribution & logistics",
    problem: "Drivers covering rural routes outside the metro were recording deliveries on paper " +
      "because the vendor app blanked out the moment cell coverage dropped. Proof of delivery " +
      "arrived at the office a day late, disputed invoices took a week to settle, and the " +
      "office manager re-keyed every ticket by hand.",
    built:
      "A route application that runs entirely in the driver's browser and keeps working with " +
      "the radio off. Stops, signatures and photos are captured locally and reconciled with " +
      "the office the next time the truck has a usable connection.",
    architecture:
      "IndexedDB holds the day's route as the source of truth on the device. A service worker " +
      "serves the application shell so a cold start needs no network at all. Completed stops " +
      "queue as an append-only log and sync through a single Deno endpoint that validates every " +
      "record and resolves conflicts by stop id and timestamp.",
    rationale:
      "Connectivity is the constraint, so the design starts there. Treating the device as " +
      "authoritative and the server as a reconciler removes the entire class of failures where " +
      "a spinner blocks a driver who is standing at a loading dock.",
    stack: ["Deno", "TypeScript", "IndexedDB", "Service Worker", "SQLite", "Nginx"],
    outcome: [
      "Paper tickets eliminated on all rural routes",
      "Invoice disputes settle same-day instead of within a week",
      "Office re-keying reduced to exception handling only",
    ],
  },
  {
    slug: "shop-scheduler",
    name: "Shop Scheduler",
    summary: "Bay scheduling and customer messaging for an independent auto shop.",
    year: "2025",
    sector: "Automotive service",
    problem:
      "Three service bays were booked on a paper calendar at the counter. Double-bookings were " +
      "routine, customers called constantly for status updates, and the shop was paying a " +
      "monthly per-seat fee for a scheduling product that still could not answer 'is my car " +
      "ready'.",
    built:
      "A scheduling board sized for the counter monitor and a status page each customer reaches " +
      "from a texted link. Writing a status on the board is what sends the update; there is no " +
      "second system to keep in sync.",
    architecture:
      "Server-rendered HTML with progressive enhancement: the board is usable with JavaScript " +
      "disabled, and a small script upgrades it to live updates over server-sent events. State " +
      "is a single SQLite database file. Customer links are signed, expiring tokens that grant " +
      "read access to exactly one work order.",
    rationale:
      "A repair shop needs the counter screen to be correct, fast and boring. Server-rendered " +
      "pages with one enhancement layer meant no build pipeline, no client framework to upgrade " +
      "every quarter, and a system the owner can back up by copying a file.",
    stack: ["Deno", "TypeScript", "SQLite", "Server-Sent Events", "Zod", "systemd"],
    outcome: [
      "Double-bookings ended in the first week",
      "Status calls to the front desk down sharply",
      "Per-seat subscription retired; the shop owns the software outright",
    ],
  },
  {
    slug: "permit-intake",
    name: "Permit Intake",
    summary: "Document intake and review queue for a specialty contractor.",
    year: "2024",
    sector: "Construction & trades",
    problem:
      "Permit packets arrived as email attachments, lived in one estimator's inbox, and went " +
      "missing whenever that estimator was on a jobsite. Nobody could say which packets were " +
      "waiting on the city and which were waiting on the office.",
    built: "An intake form and a review queue with an audit trail. Every packet has a state, an " +
      "owner and a history, and the queue is the only place work is tracked.",
    architecture:
      "Uploads are size-capped and content-type checked at the edge, written outside the web " +
      "root with generated names, and served back only through an authenticated handler — the " +
      "filesystem is never addressable from a URL. Form input is validated with Zod at the " +
      "boundary, and state transitions are explicit functions with no hidden effects.",
    rationale: "File upload is where small business applications get breached. Making uploads " +
      "unreachable by path, non-executable by storage location and validated by schema removes " +
      "the common failure modes rather than filtering for them after the fact.",
    stack: ["Deno", "TypeScript", "Zod", "SQLite", "Nginx", "Ubuntu LTS"],
    outcome: [
      "Packet status answerable in seconds by anyone in the office",
      "Complete audit trail for every submission",
      "Estimator's inbox no longer a single point of failure",
    ],
  },
  {
    slug: "counter-menu",
    name: "Counter Menu",
    summary: "Self-hosted menu and ordering page for a family restaurant.",
    year: "2024",
    sector: "Food service",
    problem:
      "The restaurant's menu lived inside a hosted page builder that loaded slowly on phones, " +
      "charged a monthly fee to change prices, and pushed customers toward a delivery " +
      "marketplace that took a cut of every order.",
    built:
      "A fast, static-first menu the owner edits directly, with call-ahead ordering that sends " +
      "tickets straight to the kitchen printer.",
    architecture:
      "The menu is generated from one structured data file into static HTML at startup. No " +
      "client-side framework, no third-party scripts, no fonts or trackers from other origins — " +
      "which is also what makes the Content-Security-Policy strict enough to be meaningful.",
    rationale:
      "Most of a restaurant's traffic is a hungry person on a phone on mobile data. Shipping " +
      "static HTML and a few kilobytes of CSS is not a compromise for that audience; it is the " +
      "best possible experience, and it costs a few dollars a month to run.",
    stack: ["Deno", "HTML", "CSS", "Static generation", "Nginx"],
    outcome: [
      "Menu loads in well under a second on mobile data",
      "Price changes made by the owner in minutes, at no cost",
      "Orders taken directly instead of through a marketplace commission",
    ],
  },
] as const;
