/**
 * session.js — replay the hero's Claude Code session.
 *
 * The transcript is already complete in the HTML when this file runs. Nothing
 * here creates content: it hides finished lines, then brings them back in
 * order. If this module never loads, or throws, or the visitor prefers reduced
 * motion, the finished session is what stays on screen — the same contract
 * typewriter.js keeps with the hero's rotating word.
 *
 * Anime.js earns its bytes here for the same reason it does in sky.js: one
 * timeline coordinating a staggered reveal, a caret, a sweep and a flash is
 * work a library already does well. It is imported only when the figure is
 * actually on screen, because 42 KB has no business in the critical path of a
 * hero that is already readable without it.
 */

import { motionAllowed, pageVisible } from "./motion.js";

const TYPE_MS = 42;
const ROW_STAGGER = 260;
const HOLD_MS = 7000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolve once the tab is visible again, so nothing animates in the dark. */
function whenVisible() {
  if (pageVisible()) return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (!pageVisible()) return;
      document.removeEventListener("visibilitychange", onChange);
      resolve();
    };
    document.addEventListener("visibilitychange", onChange);
  });
}

/** Resolve the first time `element` is at least partly on screen. */
function whenSeen(element) {
  if (!("IntersectionObserver" in globalThis)) return Promise.resolve();
  return new Promise((resolve) => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.disconnect();
        resolve();
        return;
      }
    }, { rootMargin: "0px 0px -10% 0px" });
    observer.observe(element);
  });
}

/** Type `text` into `element` one character at a time. */
async function type(element, text, stopped) {
  for (let length = 1; length <= text.length; length++) {
    if (stopped()) return;
    element.textContent = text.slice(0, length);
    await wait(TYPE_MS);
  }
}

/**
 * The other businesses this workflow has been run for, as `[text, detail]` per
 * row. Anything malformed returns an empty list and the session simply loops
 * the one the server rendered: a bad attribute must never blank the terminal.
 */
function readRotation(figure, rowCount) {
  try {
    const parsed = JSON.parse(figure.dataset.sessions ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) =>
      entry !== null &&
      typeof entry === "object" &&
      Array.isArray(entry.rows) &&
      // The script writes onto rows that already exist. An entry of a
      // different length would leave half a transcript from one business and
      // half from another, which is worse than not rotating at all.
      entry.rows.length === rowCount
    );
  } catch {
    return [];
  }
}

export function initSession(root = document) {
  const figure = root.querySelector("[data-session]");
  if (figure === null) return;

  const rows = [...figure.querySelectorAll("[data-session-row]")];
  if (rows.length === 0) return;

  // Reduced motion keeps the finished transcript exactly as it was served.
  if (!motionAllowed()) return;

  const prompt = figure.querySelector("[data-session-typed]");
  const pathLabel = figure.querySelector("[data-session-path]");
  const rotation = readRotation(figure, rows.length);

  let stopped = false;
  let index = 0;
  const isStopped = () => stopped;

  /** Write one subject's text onto the rows already in the DOM. */
  function paint(entry) {
    if (pathLabel !== null && typeof entry.path === "string") {
      pathLabel.textContent = entry.path;
    }
    rows.forEach((row, i) => {
      const [text, detail] = entry.rows[i] ?? [];
      const textNode = row.querySelector(".session__text");
      const detailNode = row.querySelector(".session__detail");
      if (textNode !== null && typeof text === "string") textNode.textContent = text;
      if (detailNode !== null && typeof detail === "string") detailNode.textContent = detail;
    });
  }

  // Read after any paint, never cached: the prompt is what gets typed, and it
  // changes with the subject. `activePrompt` is whatever the currently painted
  // business asked for, so a failure part-way through typing can restore a
  // whole sentence rather than half of one.
  const currentPrompt = () => (prompt === null ? "" : prompt.textContent);
  let activePrompt = currentPrompt();

  async function run() {
    await whenSeen(figure);
    await whenVisible();

    const { default: anime } = await import("../vendor/anime.es.js");

    // Only now does the finished transcript give way to the animation. Doing
    // this any earlier would blank the figure for however long the import
    // takes, which on a slow connection is the whole visit.
    figure.setAttribute("data-session-playing", "");

    while (!stopped) {
      await whenVisible();
      if (stopped) return;

      // Loop one is what the server rendered; later loops swap in the next
      // business before anything is hidden, so the measurement below sees the
      // text that is about to be typed.
      if (rotation.length > 1 && index > 0) paint(rotation[index % rotation.length]);
      activePrompt = currentPrompt();

      // The prompt wraps to two or three lines on a phone, and emptying it
      // would collapse the terminal and then grow it again on every loop.
      // Measured each time, so it stays right across rotation and resize.
      if (prompt !== null) {
        rows[0].style.minHeight = "";
        rows[0].style.minHeight = `${rows[0].getBoundingClientRect().height}px`;
      }

      for (const row of rows) row.style.opacity = "0";
      if (prompt !== null) prompt.textContent = "";

      // The prompt types first, alone: someone asking for something.
      rows[0].style.opacity = "1";
      if (prompt !== null) await type(prompt, activePrompt, isStopped);
      if (stopped) return;

      // Then the work answers, one line at a time.
      const answers = rows.slice(1);
      if (answers.length > 0) {
        await anime({
          targets: answers,
          opacity: [0, 1],
          translateY: [6, 0],
          delay: anime.stagger(ROW_STAGGER),
          duration: 420,
          easing: "easeOutQuad",
        }).finished;
      }

      // The last line is the payoff — deployed, live — so it gets the one
      // flourish in the whole sequence.
      const last = rows[rows.length - 1];
      await anime({
        targets: last,
        scale: [1, 1.03, 1],
        duration: 620,
        easing: "easeOutQuad",
      }).finished;

      await wait(HOLD_MS);
      index += 1;
    }
  }

  void run().catch(() => {
    // Any failure returns the visitor to a finished transcript rather than
    // leaving half a session on screen. Whichever business was last painted is
    // complete and true, so it is a fine one to be left looking at.
    figure.removeAttribute("data-session-playing");
    for (const row of rows) {
      row.style.opacity = "";
      row.style.minHeight = "";
    }
    if (prompt !== null) prompt.textContent = activePrompt;
  });

  return () => {
    stopped = true;
  };
}
