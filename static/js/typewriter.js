/**
 * typewriter.js — retype the hero's rotating lines.
 *
 * The first word is already in the HTML, so each line is complete before this
 * file runs and stays complete if it never does. The animation only ever
 * replaces text that is already there.
 *
 * Two callers, one module. The benefit line types, character by character,
 * because that is the line the eye should land on. The tagline cross-fades
 * between languages, because two blinking carets in one viewport is noise
 * rather than craft — `data-mode="fade"` picks which.
 *
 * A word may be a plain string or `{ text, lang }`. The lang is not decoration:
 * without it a screen reader pronounces "Une Personne" with English phonemes.
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

const FADE_MS = 420;
const FADE_HOLD_MS = 3600;

/**
 * Normalise the data attribute to `{ text, lang }`, accepting either shape.
 * Anything malformed is dropped rather than thrown: a broken attribute should
 * cost the rotation, never the line that is already on screen.
 */
function readWords(element) {
  try {
    const parsed = JSON.parse(element.dataset.words ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((word) => {
        if (typeof word === "string") return { text: word, lang: null };
        if (word !== null && typeof word === "object" && typeof word.text === "string") {
          return { text: word.text, lang: typeof word.lang === "string" ? word.lang : null };
        }
        return null;
      })
      .filter((word) => word !== null);
  } catch {
    return [];
  }
}

/** Wire one rotator. Returns a stop function, or undefined if it does nothing. */
function startRotator(element) {
  const output = element.querySelector("[data-typewriter-text]");
  const words = readWords(element);
  if (output === null || words.length < 2) return;

  // The rotation is decoration; a screen reader should hear the words once,
  // not every keystroke of every one of them.
  element.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "visually-hidden";
  // Only the first: for the tagline the rest are the same sentence in other
  // languages, and reading all five aloud would be five times the same thing.
  label.textContent = element.dataset.mode === "fade"
    ? words[0].text
    : words.map((word) => word.text).join(", ");
  element.after(label);

  if (!motionAllowed()) return;

  const current = output.textContent.trim();
  let index = words.findIndex((word) => word.text === current);
  if (index < 0) index = 0;
  let stopped = false;

  /** Put the text and its language on screen together, never one without the other. */
  function show(word, text) {
    output.textContent = text;
    if (word.lang === null) output.removeAttribute("lang");
    else output.setAttribute("lang", word.lang);
  }

  async function fade() {
    while (!stopped) {
      await wait(FADE_HOLD_MS);
      await whenVisible();
      if (stopped) return;

      output.style.opacity = "0";
      await wait(FADE_MS);
      if (stopped) return;

      index = (index + 1) % words.length;
      const next = words[index];
      // Text and lang swap while invisible, so the two never disagree on screen.
      show(next, next.text);
      output.style.opacity = "1";
      await wait(FADE_MS);
    }
  }

  async function type() {
    await wait(HOLD_MS);
    while (!stopped) {
      await whenVisible();
      const word = words[index];
      for (let length = word.text.length; length >= 0; length--) {
        if (stopped) return;
        output.textContent = word.text.slice(0, length);
        await wait(ERASE_MS);
      }
      await wait(BETWEEN_MS);

      index = (index + 1) % words.length;
      const next = words[index];
      show(next, "");
      for (let length = 1; length <= next.text.length; length++) {
        if (stopped) return;
        output.textContent = next.text.slice(0, length);
        await wait(TYPE_MS);
      }
      await wait(HOLD_MS);
    }
  }

  void (element.dataset.mode === "fade" ? fade() : type());
  return () => {
    stopped = true;
  };
}

export function initTypewriter(root = document) {
  // All of them, not the first: the hero has two now, and querySelector would
  // silently leave the tagline unrotated.
  const stops = [...root.querySelectorAll("[data-typewriter]")]
    .map(startRotator)
    .filter((stop) => stop !== undefined);

  if (stops.length === 0) return;
  return () => {
    for (const stop of stops) stop();
  };
}
