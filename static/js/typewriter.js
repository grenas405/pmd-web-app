/**
 * typewriter.js — retype the hero's rotating discipline.
 *
 * The first word is already in the HTML, so the line is complete before this
 * file runs and stays complete if it never does. The animation only ever
 * replaces text that is already there.
 */

import { motionAllowed, pageVisible } from "./motion.js";

const TYPE_MS = 55;
const ERASE_MS = 28;
const HOLD_MS = 2100;
const BETWEEN_MS = 420;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolve once the tab is visible again, so typing never runs in the dark. */
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

function readWords(element) {
  try {
    const parsed = JSON.parse(element.dataset.words ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((word) => typeof word === "string") : [];
  } catch {
    return [];
  }
}

export function initTypewriter(root = document) {
  const element = root.querySelector("[data-typewriter]");
  if (element === null) return;

  const output = element.querySelector("[data-typewriter-text]");
  const words = readWords(element);
  if (output === null || words.length < 2) return;

  // The rotation is decoration; a screen reader should hear the first word
  // once, not every keystroke of every word.
  element.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "visually-hidden";
  label.textContent = words.join(", ");
  element.after(label);

  if (!motionAllowed()) return;

  let index = words.indexOf(output.textContent.trim());
  if (index < 0) index = 0;
  let stopped = false;

  async function run() {
    await wait(HOLD_MS);
    while (!stopped) {
      await whenVisible();
      const current = words[index];
      for (let length = current.length; length >= 0; length--) {
        if (stopped) return;
        output.textContent = current.slice(0, length);
        await wait(ERASE_MS);
      }
      await wait(BETWEEN_MS);

      index = (index + 1) % words.length;
      const next = words[index];
      for (let length = 1; length <= next.length; length++) {
        if (stopped) return;
        output.textContent = next.slice(0, length);
        await wait(TYPE_MS);
      }
      await wait(HOLD_MS);
    }
  }

  void run();
  return () => {
    stopped = true;
  };
}
