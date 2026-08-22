/**
 * main.js — the only script the page loads directly.
 *
 * Each enhancement is independent and optional: one throwing must not stop the
 * others, and none of them is required for the page to work. That is the whole
 * client-side architecture.
 */

import { initNav } from "./nav.js";
import { initHero } from "./hero.js";
import { initTypewriter } from "./typewriter.js";
import { initReveal } from "./reveal.js";
import { initContactForm } from "./contact.js";
import { initSession } from "./session.js";
import { initSplash } from "./splash.js";
import { initLayers } from "./layers.js";
import { initCodeRain } from "./coderain.js";

function attempt(name, start) {
  try {
    start();
  } catch (error) {
    console.warn(`[pmd] ${name} enhancement unavailable`, error);
  }
}

attempt("navigation", initNav);
// Above the fold, so it does not wait to be seen. It still imports Anime.js
// lazily, and a visitor who prefers reduced motion never triggers that import.
attempt("hero", initHero);
attempt("typewriter", initTypewriter);
attempt("reveal", initReveal);
attempt("contact form", initContactForm);
// Cheap to start: it waits for the figure to be on screen before it imports
// Anime.js, so nothing heavy happens here.
attempt("session", initSession);
// Sets two listeners and returns. Nothing is shown until six seconds have
// passed and the reader is a quarter of the way down the page.
attempt("splash", initSplash);
// Waits for the stack to be on screen before importing Anime.js, so a visitor
// who never scrolls that far never pays for it.
attempt("layers", initLayers);
// Only ever finds its canvas on the sign-in page; everywhere else it returns.
attempt("code rain", initCodeRain);

// The two background layers are the heaviest enhancements and the least
// important, so they are loaded on their own, after everything else, and only
// when they will be used. The starfield the server drew stays until they do.
if (!globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const load = () => {
    void import("./rain.js")
      .then((module) => module.initRain())
      .catch((error) => console.warn("[pmd] code rain unavailable", error));
    return import("./sky.js")
      .then((module) => module.initSky())
      .catch((error) => console.warn("[pmd] sky unavailable", error));
  };

  if ("requestIdleCallback" in globalThis) {
    globalThis.requestIdleCallback(load, { timeout: 2500 });
  } else {
    globalThis.addEventListener("load", () => setTimeout(load, 400), { once: true });
  }
}
