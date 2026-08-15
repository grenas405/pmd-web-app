/**
 * session.ts — the Claude Code session shown in the hero, as data.
 *
 * It is an illustration, not a recording: a real session of this kind is
 * longer, has more false starts, and is far less tidy. The figcaption on the
 * page says so, because a transcript that looks captured should either be
 * captured or admit that it is not.
 *
 * What is true is the shape of it — read the file, write the change, run the
 * tests, deploy — and the fact that a change of this size takes minutes rather
 * than a sprint. That is the whole claim the hero is making.
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

/** The working directory shown in the terminal's title bar. */
export const sessionPath = "~/heavenly-roofing";

export const session: readonly SessionLine[] = [
  { kind: "prompt", text: "add a quote request form to the site" },
  { kind: "tool", tool: "Read", text: "src/pages/home.ts" },
  { kind: "tool", tool: "Write", text: "src/pages/quote.ts", detail: "+48" },
  { kind: "tool", tool: "Write", text: "src/contact/schema.ts", detail: "+12" },
  { kind: "tool", tool: "Bash", text: "deno task test" },
  { kind: "output", text: "24 passed", detail: "0 failed · 1s" },
  { kind: "tool", tool: "Bash", text: "sudo scripts/deploy.sh" },
  { kind: "output", text: "live at heavenlyroofingllc.com" },
  { kind: "summary", text: "4 files · 6 minutes" },
];

/**
 * What a screen reader hears in place of the animation. One sentence, because
 * the alternative is every keystroke of every line read aloud.
 */
export const sessionSummary =
  "A development session: a request in plain English, two files written, the test suite passing, " +
  "and the change deployed to a live customer site in six minutes.";
