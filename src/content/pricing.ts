/**
 * pricing.ts — what it costs, as data.
 *
 * One plan, one price, and the arithmetic written out. A pricing page that
 * leaves the first-year total to be worked out by the reader is a pricing page
 * that gets a text message asking what it costs, which is the thing it existed
 * to prevent.
 *
 * `firstYear` and `perYearAfter` are computed rather than typed in, so the copy
 * cannot drift away from the numbers above it. Tests assert both.
 *
 * The comparison figures are published industry ranges, each traceable to the
 * source it came from — never a claim about what any particular firm charges.
 * Every figure below was read off the cited page. If one cannot be traced, take
 * the row out rather than round it or guess.
 */

export const PLAN_ID = "launch-295";
export type PlanId = typeof PLAN_ID;

export const plan = {
  id: PLAN_ID,
  name: "Launch",
  /** One-time, to design, build and put it live. */
  build: 295,
  /** Care, support, hosting and small changes. */
  care: 20,
  termMonths: 12,
  get firstYear(): number {
    return this.build + this.care * this.termMonths;
  },
  get perYearAfter(): number {
    return this.care * this.termMonths;
  },
} as const;

/** What the $295 and the $20 a month actually buy. */
export const included: readonly string[] = [
  "A complete website, designed for your business and written with you",
  "Built to load fast on a phone with two bars of signal",
  "A contact, quote or booking form wired to your inbox",
  "Your domain registered and managed for the first year",
  "HTTPS, daily backups, and the server kept patched",
  "Small changes — hours, prices, staff, photos — whenever you need them",
  "Found by Google: sitemap, structured data, and the local listing basics",
  "One person to text when something looks wrong",
];

/** Said plainly, so it is never a surprise on an invoice. */
export const notIncluded: readonly string[] = [
  "Advertising budget, if you choose to run ads",
  "Professional photography or video, though I will happily shoot the basics",
  "Payment processing fees, if you sell online",
  "Domain renewal after the first year — roughly $20, billed at cost",
];

export interface ComparisonRow {
  readonly label: string;
  /** Published range for the same thing, elsewhere. */
  readonly typical: string;
  readonly here: string;
  /** Index into `sources`. */
  readonly source: number;
}

export const comparison: readonly ComparisonRow[] = [
  {
    label: "Build and launch",
    typical: "$8,000 – $15,000",
    here: "$295",
    source: 0,
  },
  {
    label: "Care, hosting and support",
    typical: "$3,600 – $12,720 / year",
    here: "$240 / year",
    source: 0,
  },
  {
    label: "Agency build, quoted range",
    typical: "$5,000 – $30,000",
    here: "$295",
    source: 1,
  },
  {
    label: "First year, all in",
    typical: "$11,600 – $27,720",
    here: "$535",
    source: 0,
  },
];

export interface Source {
  readonly label: string;
  readonly url: string;
  readonly note: string;
}

export const sources: readonly Source[] = [
  {
    label: "Digital Applied — Website Development Cost 2026",
    url: "https://www.digitalapplied.com/blog/website-development-cost-2026-complete-pricing-data",
    note:
      "Small-business brochure sites at $3,000–$8,000 with a freelancer and $8,000–$15,000 with a " +
      "boutique agency; annual ongoing cost of $3,600–$12,720. Cites the Clutch 2026 survey, in " +
      "which 61% of small-business buyers spent under $10,000 on their most recent website.",
  },
  {
    label: "Leadpages — 2026 Website Design Price Guide",
    url: "https://leadpages.com/blog/average-cost-of-website-design-for-small-business",
    note:
      "$500–$5,000 one-time for a freelance designer; $5,000–$30,000 and up for an agency build.",
  },
];

/**
 * The headline claim, kept deliberately conservative.
 *
 * $535 against the *cheapest* published first year — a $3,000 freelancer build
 * plus $3,600 of annual care, so $6,600 — is about one twelfth. Against the
 * agency ranges in the table it is closer to one twentieth. "About a tenth" is
 * therefore a claim that survives being checked against the low end, which is
 * the only kind worth printing.
 */
export const headline = {
  multiple: "about a tenth",
  people: "one person, not a team of six",
} as const;
