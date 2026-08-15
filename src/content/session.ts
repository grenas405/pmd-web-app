/**
 * session.ts — the Claude Code session shown in the hero, as data.
 *
 * It is an illustration, not a recording: a real session is longer, has more
 * false starts, and is far less tidy. The figcaption on the page says so,
 * because a transcript that looks captured should either be captured or admit
 * that it is not.
 *
 * What is true is the shape of it, and the shape is the point. The same prompt,
 * the same five steps and the same deploy command produce a web app for a
 * roofer, a church or a technology firm — which is the only reason one engineer
 * can keep several of them running. The hero rotates through three of those
 * businesses to show exactly that.
 *
 * Every host named below is a site that is actually live. A visitor who checks
 * one and finds nothing has learned that this page's evidence does not survive
 * checking, and they will not stop at the one that was invented — so the list
 * is kept honest by a test in tests/content_test.ts, which refuses any subject
 * whose host is missing from the roster in live.ts.
 */

export interface SessionLine {
  /** Which part of the exchange this is; the renderer styles each one. */
  readonly kind: "prompt" | "tool" | "output" | "summary";
  /** The tool Claude Code reached for. Rendered as the gold marker. */
  readonly tool?: "Read" | "Write" | "Bash";
  readonly text: string;
  /** The trailing note: a diff size, a test count, a URL. */
  readonly detail?: string;
}

/** One business the workflow has been run for. */
export interface SessionSubject {
  /** The working directory in the terminal's title bar. */
  readonly path: string;
  /** How the business is named in the prompt. */
  readonly business: string;
  /** Where it ended up. Must be a host listed in live.ts. */
  readonly host: string;
  /** Three builds reporting the same test count would give the game away. */
  readonly tests: number;
}

export interface Session {
  readonly path: string;
  readonly lines: readonly SessionLine[];
}

export const subjects: readonly SessionSubject[] = [
  {
    path: "~/heavenly-roofing",
    business: "Heavenly Roofing LLC",
    host: "heavenlyroofingllc.com",
    tests: 31,
  },
  {
    path: "~/mercy-seat",
    business: "Mercy Seat Ministries",
    host: "msmokc.org",
    tests: 24,
  },
  {
    path: "~/praxedis",
    business: "Praxedis Technologies",
    host: "praxedistechnologies.com",
    tests: 38,
  },
];

/**
 * The workflow, applied to one business.
 *
 * Written as a template rather than three hand-kept arrays because the
 * animation depends on every session having the same rows in the same order:
 * the server renders the first one, and the script swaps text between loops
 * instead of rebuilding the list. Generating them from one function makes that
 * invariant impossible to break by editing.
 *
 * The route is `contact.ts`, not `quote.ts` — a contact route fits a roofer, a
 * church and a technology firm alike, which is the whole idea.
 */
export function sessionFor(subject: SessionSubject): Session {
  return {
    path: subject.path,
    lines: [
      {
        kind: "prompt",
        text: `implement a Deno web app for ${subject.business} in Oklahoma City, Oklahoma ` +
          "using @std/http and Zod",
      },
      { kind: "tool", tool: "Bash", text: "deno add jsr:@std/http jsr:@zod/zod" },
      { kind: "tool", tool: "Write", text: "main.ts", detail: "+64" },
      { kind: "tool", tool: "Write", text: "src/routes/contact.ts", detail: "+91" },
      { kind: "tool", tool: "Write", text: "src/contact/schema.ts", detail: "+23" },
      { kind: "tool", tool: "Bash", text: "deno task verify" },
      { kind: "output", text: `${subject.tests} passed`, detail: "0 failed · 2s" },
      { kind: "tool", tool: "Bash", text: "sudo scripts/deploy.sh" },
      { kind: "output", text: `live at ${subject.host}` },
      { kind: "summary", text: "6 files · tests green · live" },
    ],
  };
}

export const sessions: readonly Session[] = subjects.map(sessionFor);

/** What the server renders, and what a visitor without JavaScript reads. */
export const session: readonly SessionLine[] = sessions[0]!.lines;
export const sessionPath: string = sessions[0]!.path;

/**
 * What a screen reader hears in place of the animation. One sentence, because
 * the alternative is every keystroke of every line read aloud.
 */
export const sessionSummary =
  "A development session: a request in plain English, the standard library and Zod added from " +
  "JSR, a small Deno web application written and tested, and the whole thing deployed to a live " +
  "address with one command.";
