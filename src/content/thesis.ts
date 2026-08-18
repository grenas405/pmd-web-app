/**
 * thesis.ts — the argument, as data.
 *
 * Every figure on the page traces to an entry in `sources`, and the tests
 * refuse a figure whose source index does not resolve. That is not ceremony:
 * this page argues that a business should be able to check what it is told,
 * and it would be a poor advertisement for that if its own numbers could not
 * be checked.
 *
 * ON THE QUOTATION. It was verified against the episode transcript, not taken
 * from a summary — the tidied version circulating in search results differs
 * from what was actually said, and one outlet attributes the passage to the
 * wrong host. Two rules follow, and a test enforces the first:
 *
 *   1. Quote it whole. It places value at the application layer AND in the
 *      infrastructure below. Cropping the second clause would make it say
 *      something the speaker did not say — and would throw away the evidence
 *      the "commoditised is not eliminated" section rests on.
 *   2. Do not borrow the conclusion. Chamath is describing where investable
 *      value sits in the AI economy. The step from there to "a local business
 *      should own its applications" is this site's own argument, and the page
 *      says so rather than leaning on his authority for it.
 *
 * No episode number appears anywhere here. Two sources disagree about it, so
 * it is not stated.
 */

export interface Source {
  readonly label: string;
  readonly url: string;
  /** What this source actually supports. One line, in plain words. */
  readonly note: string;
}

export const sources: readonly Source[] = [
  {
    label: "All-In Podcast — “The Fight Over Open Source AI…”, 24 July 2026",
    url:
      "https://podscripts.co/podcasts/all-in-with-chamath-jason-sacks-friedberg/the-fight-over-open-source-ai-anthropics-15b-payout-nyc-socialists-evictions-violence",
    note:
      "Chamath Palihapitiya, around ten minutes in, on models commoditising “much faster than " +
      "anybody thought” and where the business model has gone. Full transcript.",
  },
  {
    label: "Chamath Palihapitiya — “Deep Dive: Where Value Accrues in the AI Stack”",
    url: "https://chamath.substack.com/p/the-ai-stack",
    note:
      "A six-layer map of the AI economy, researched in the first quarter of 2026. The source of " +
      "the 1,500× fall in the cost of running a model, and of the point that infrastructure is " +
      "“the most concentrated layer in the stack”.",
  },
  {
    label: "Veracode — GenAI Code Security Report (2025, updated spring 2026)",
    url: "https://www.veracode.com/blog/genai-code-security-report/",
    note: "Over 100 models across 80 coding tasks: 45% of the code they produced introduced a " +
      "security flaw, and the pass rate has barely moved in two years.",
  },
  {
    label: "Cledara — average SaaS spend per employee, 2026",
    url: "https://www.cledara.com/blog/average-saas-spend-per-employee-2026",
    note:
      "Benchmarks for what companies pay to rent software. Note that “small business” in surveys " +
      "like this means firms far larger than a roofer or a church — read it as direction, not as " +
      "a bill anyone here is receiving.",
  },
];

/** The passage, exactly as transcribed. Cropping it is a misquotation. */
export const quote = {
  text:
    "The real business model is not in the foundational model anymore. It's at the application " +
    "layer above and it's in the infrastructure below, whether that's the cloud or whether " +
    "that's chips.",
  speaker: "Chamath Palihapitiya",
  where: "All-In Podcast, 24 July 2026",
  source: 0,
} as const;

/** The clause that must survive every future edit of the quotation. */
export const QUOTE_SECOND_CLAUSE = "it's in the infrastructure below";

export interface Layer {
  readonly name: string;
  /** What sits here, said plainly. */
  readonly gloss: string;
  /** The one layer a business can actually own. Exactly one is true. */
  readonly yours?: true;
}

/**
 * The six layers, bottom to top, from the map in `sources[1]` — not invented
 * here. A test checks the count and that exactly one is marked `yours`, so the
 * diagram on the landing page cannot drift away from the source it illustrates.
 */
export const layers: readonly Layer[] = [
  { name: "Infrastructure", gloss: "Power, buildings, cooling" },
  { name: "Chips", gloss: "The silicon everything runs on" },
  { name: "Data", gloss: "What the models learned from" },
  { name: "Models", gloss: "The intelligence itself" },
  { name: "Execution", gloss: "Getting the work done reliably" },
  { name: "Application", gloss: "Your work, your customers, your way", yours: true },
];

/** The headline figure, with the source that carries it. */
export const modelPriceDrop = { value: 1500, label: "1,500×", source: 1 } as const;

export interface Path {
  readonly title: string;
  readonly steps: readonly string[];
  readonly ends: string;
  /** True for the arrangement this site argues for. */
  readonly owned: boolean;
}

export const contrast: readonly Path[] = [
  {
    title: "Renting",
    steps: [
      "Your business",
      "A monthly subscription",
      "Software built for ten thousand businesses",
    ],
    ends: "The vendor owns the software, your data and what gets built next.",
    owned: false,
  },
  {
    title: "Owning",
    steps: [
      "Your business",
      "An open-source foundation",
      "Software built for you, with AI",
    ],
    ends: "You own the software, your data and how the work actually gets done.",
    owned: true,
  },
];

export interface Objection {
  readonly objection: string;
  readonly answer: string;
  /** Set when the answer rests on a published figure. */
  readonly source?: number;
}

/**
 * Written to be read aloud. If an answer sounds like it is dodging, it is —
 * and this section is the reason anything else on the page is believable.
 */
export const objections: readonly Objection[] = [
  {
    objection: "AI writes insecure code.",
    answer:
      "Often it does. Veracode put more than a hundred models through eighty coding tasks: 45% " +
      "of what came out had a security flaw in it, and that number has barely moved in two " +
      "years. So the code is not trusted because a machine wrote it. Everything arriving from " +
      "outside is checked before anything else sees it, the server starts with permission to do " +
      "nothing and is given back only what the job needs, and the whole suite runs on every " +
      "change. This site is built that way too — the source is public, and you can read it.",
    source: 2,
  },
  {
    objection: "Who maintains it when you are busy, or gone?",
    answer:
      "The honest answer is that this is the strongest objection on the page. Day to day, the " +
      "$20 a month is exactly this. Beyond that: the code is yours, it is small enough for " +
      "another developer to read in an afternoon, and it is built on tools thousands of people " +
      "already know. That is a genuinely better position than a custom system nobody else can " +
      "open — but it is not the same as no risk, and I will not pretend otherwise.",
  },
  {
    objection: "Custom software rots. Ours will become a mess.",
    answer:
      "Big ones do. The defence here is size: a system small enough to hold in your head is one " +
      "that can be changed in an afternoon three years from now. There is no framework underneath " +
      "it waiting to force a rewrite, and very little borrowed code to keep in step.",
  },
  {
    objection: "What about the rules — cards, health data, anything regulated?",
    answer:
      "Then it is out of scope unless it is designed for from the start, and I will tell you that " +
      "in the first conversation rather than the last. Card payments go through a processor that " +
      "already carries that burden. Regulated records are a different kind of project with a " +
      "different price, and pretending otherwise would be how people get hurt.",
  },
  {
    objection: "Do we really own the data?",
    answer:
      "Yes, and it is worth being concrete. The domain is registered in your name. The site runs " +
      "on hosting in your name. The database is a file on a machine you pay for, and you can " +
      "take a copy of it whenever you like. Nothing is held anywhere you cannot reach without me.",
  },
  {
    objection: "You still depend on somebody. Deno, a host, an AI company.",
    answer:
      "True, and worth saying plainly: nobody is independent of the internet. You rent a server, " +
      "a domain, and — where the software uses AI — somebody's models. The claim is narrower " +
      "than independence. It is that the layer holding your work, your customers and your way of " +
      "doing things belongs to you, and that everything underneath it can be swapped for " +
      "something else without rewriting that layer. Renting compute is not the same as renting " +
      "your own operations.",
  },
  {
    objection: "Can a business our size really carry custom software?",
    answer:
      "Not alone, and I would not suggest it. That is what the monthly fee is for. Owning it " +
      "means the asset and the exit belong to you — not that you are handed a repository and " +
      "wished luck. The difference shows up the day you want to change something, or the day you " +
      "want to leave.",
  },
];

/** The spine of the argument, and the last thing the page says. */
export const spine = [
  "A small open-source foundation",
  "AI collapses the cost of building",
  "You own the layer where your value lives",
] as const;
