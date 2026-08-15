/**
 * faq.ts — the questions that otherwise arrive as a text message at 9pm.
 *
 * Answering them on the page is not only kinder to the reader; it is the
 * difference between an enquiry that starts at "how much?" and one that starts
 * at "when can you start?". Each answer is written the way it would be said out
 * loud, and none of them dodges.
 *
 * These are also emitted as schema.org FAQPage data from site.ts, so the
 * answers can appear directly in search results. Keep them self-contained —
 * an answer that only makes sense next to the one above it reads badly there.
 */

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

export const faq: readonly FaqEntry[] = [
  {
    question: "What do I actually own?",
    answer:
      "All of it. The domain is registered in your name, the site runs on hosting in your name, " +
      "and you get the source code. Nothing is held hostage — if you stop working with me " +
      "tomorrow, the site keeps running and another developer can pick it up.",
  },
  {
    question: "What happens after the first year?",
    answer: "The $20 a month continues if you want it to, and covers hosting, backups, security " +
      "updates and small changes. There is no second build fee and no renewal contract. The " +
      "domain renews at cost, usually around $20 a year.",
  },
  {
    question: "What if I want to leave?",
    answer:
      "You give me a month's notice and I hand over everything: the domain, the hosting login, " +
      "the code and the backups. No exit fee, no data to extract, no held credentials. The " +
      "one-year agreement covers the build, not your freedom to walk away from it.",
  },
  {
    question: "Who fixes it when something breaks?",
    answer:
      "I do, and you text me directly — no ticket queue, no account manager. The sites I run are " +
      "monitored, so most problems I know about before the owner does.",
  },
  {
    question: "How can it be this much cheaper than an agency?",
    answer:
      "Two reasons. There is one person instead of a team of six, so you are not paying for " +
      "account management, project management and handoffs between them. And I use AI to do the " +
      "mechanical half of the work — scaffolding, tests, the tedious refactors — so a build that " +
      "would have taken weeks takes days. The judgment is still mine; the typing is not.",
  },
  {
    question: "Do I need to understand any of the technical side?",
    answer:
      "No. We talk about your business — what you sell, who calls you, what you wish the phone " +
      "asked before it rang. I handle everything else and explain anything you want explained, " +
      "in plain words.",
  },
  {
    question: "How long does it take?",
    answer:
      "A straightforward business site is usually live within two to three weeks of our first " +
      "conversation, and you see it at a real web address from the first week rather than at the " +
      "end. Bigger builds take longer, and I tell you the date before you pay anything.",
  },
  {
    question: "What is not included?",
    answer:
      "Advertising budget, professional photography or video, payment processing fees if you " +
      "sell online, and the domain renewal after year one at roughly $20. Everything else that " +
      "keeps the site up and current is in the monthly fee.",
  },
];
