/**
 * hero.js — bring the hero in, one line at a time.
 *
 * The hero is already complete in the HTML when this runs: the name, every
 * supporting line, the buttons and the cue. This file hides those pieces and
 * returns them in reading order. If it never loads, or Anime.js fails, or the
 * visitor prefers reduced motion, the finished hero is what stays on screen —
 * the same contract session.js and layers.js keep.
 *
 * The order is the introduction a person would give: who I am, what I do, where
 * I am, what I have shipped, what it costs, and where to go next.
 *
 * No IntersectionObserver here, unlike layers.js. The hero is the top of the
 * page; waiting to be seen would mean waiting for something that already
 * happened.
 */

import { motionAllowed, pageVisible } from "./motion.js";

const LETTER_MS = 620;
const LETTER_STAGGER_MS = 26;
const LINE_MS = 480;
const LINE_STAGGER_MS = 90;

/** Resolve once the tab is actually being looked at. */
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

export function initHero(root = document) {
  const hero = root.querySelector(".hero");
  if (hero === null) return;

  const title = hero.querySelector(".hero__title");
  const letters = title === null ? [] : [...title.querySelectorAll(".hero__letter")];

  // Everything except the title, in the order it should arrive. Missing pieces
  // are simply absent from the list rather than an error: the hero is allowed
  // to change shape without this file being updated in lockstep.
  const lines = [
    ".hero__eyebrow",
    ".hero__role",
    ".hero__location",
    ".hero__stats",
    ".hero__rotator",
    ".hero__actions",
    ".hero__trust",
    ".hero__cue",
  ]
    .map((selector) => hero.querySelector(selector))
    .filter((element) => element !== null);

  const divider = hero.querySelector(".hero__divider");

  // Reduced motion keeps the hero exactly as it was served.
  if (!motionAllowed()) return;
  if (letters.length === 0 && lines.length === 0) return;

  /** Whatever happens, end on the state the server sent. */
  function settle() {
    for (const element of [...letters, ...lines]) {
      element.style.opacity = "";
      element.style.transform = "";
    }
    if (divider !== null) {
      divider.style.width = "";
      divider.style.opacity = "";
    }
    hero.removeAttribute("data-hero-playing");
  }

  async function run() {
    await whenVisible();

    const { default: anime } = await import("../vendor/anime.es.js");

    // Only now is the finished hero given up. Hiding it before the import
    // lands would blank the top of the page for the length of the download,
    // which on a slow connection is the whole visit.
    hero.setAttribute("data-hero-playing", "");
    for (const element of [...letters, ...lines]) element.style.opacity = "0";
    if (divider !== null) divider.style.width = "0";

    const timeline = anime.timeline({ easing: "easeOutQuad" });

    // 1. The eyebrow first, so the tagline is read before the name.
    if (lines.length > 0) {
      timeline.add({
        targets: lines[0],
        opacity: [0, 1],
        translateY: [10, 0],
        duration: LINE_MS,
      });
    }

    // 2. The name assembles letter by letter. This is the one flourish.
    if (letters.length > 0) {
      timeline.add({
        targets: letters,
        opacity: [0, 1],
        translateY: [28, 0],
        rotate: [4, 0],
        delay: anime.stagger(LETTER_STAGGER_MS),
        duration: LETTER_MS,
        easing: "easeOutExpo",
      }, "-=200");
    }

    // 3. The rule draws itself across.
    if (divider !== null) {
      timeline.add({
        targets: divider,
        width: ["0%", "min(18rem, 60%)"],
        duration: 520,
      }, "-=260");
    }

    // 4. The remaining lines follow in order.
    if (lines.length > 1) {
      timeline.add({
        targets: lines.slice(1),
        opacity: [0, 1],
        translateY: [12, 0],
        delay: anime.stagger(LINE_STAGGER_MS),
        duration: LINE_MS,
      }, "-=380");
    }

    await timeline.finished;
    settle();
  }

  run().catch((error) => {
    // A failed reveal must not cost the visitor the hero. Put it back exactly
    // as it was served and say so once, quietly.
    console.warn("[pmd] hero reveal stopped", error);
    settle();
  });
}
