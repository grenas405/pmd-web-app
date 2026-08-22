/**
 * typewriter.js — retype the hero's rotating lines.
 *
 * The first word is already in the HTML, so each line is complete before this
 * file runs and stays complete if it never does. The animation only ever
 * replaces text that is already there.
 *
 * Two callers, one module, chosen by `data-mode`. The benefit line resolves out
 * of noise, character by character, because it is the line the eye should land
 * on. The tagline cross-fades between languages, because two competing effects
 * in one viewport is noise rather than craft.
 *
 * A word may be a plain string or `{ text, lang }`. The lang is not decoration:
 * without it a screen reader pronounces "Une Personne" with English phonemes.
 */

import { motionAllowed, pageVisible } from "./motion.js";

const HOLD_MS = 2600;

/*
 * The scramble. A frame every 45ms is fast enough to read as machine noise and
 * slow enough that the eye catches individual characters resolving; each one
 * settles a couple of frames after the one to its left, so the sentence decodes
 * from the front.
 */
const FRAME_MS = 45;
const SETTLE_STAGGER = 1.6;
const NOISE_FRAMES = 8;

/*
 * Weighted towards letters, because a glyph the width of the letter it stands in
 * for keeps the line from breathing. Spaces are never scrambled — dissolving the
 * word boundaries turns a sentence being decoded into a wall of mush.
 */
const GLYPHS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=/<>[]{}~|";

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

  /**
   * Replace every character with noise, then let it settle left to right.
   *
   * `settleAt` is the frame each position stops being random; multiplying the
   * index spreads those out so the sentence resolves from the front rather than
   * all at once.
   */
  async function scramble(word) {
    const target = word.text;
    const total = Math.ceil(target.length * SETTLE_STAGGER) + NOISE_FRAMES;

    for (let frame = 0; frame <= total; frame++) {
      if (stopped) return;
      let out = "";
      for (let i = 0; i < target.length; i++) {
        const char = target[i];
        // Spaces and the settled head of the line are never touched.
        if (char === " " || frame - NOISE_FRAMES >= i * SETTLE_STAGGER) {
          out += char;
          continue;
        }
        out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      output.textContent = out;
      await wait(FRAME_MS);
    }

    // Unconditional, not the last loop iteration: an interrupted scramble must
    // never leave noise on the hero, which is worse than no animation at all.
    output.textContent = target;
  }

  async function decode() {
    await wait(HOLD_MS);
    while (!stopped) {
      await whenVisible();
      index = (index + 1) % words.length;
      const next = words[index];
      show(next, output.textContent);
      await scramble(next);
      if (stopped) return;
      await wait(HOLD_MS);
    }
  }

  void (element.dataset.mode === "fade" ? fade() : decode());

  // Whatever stops it, the line is left on a real slogan rather than mid-decode.
  return () => {
    stopped = true;
    output.textContent = words[index].text;
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
