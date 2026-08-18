/**
 * layers.js — build the stack, then send the value to the top of it.
 *
 * The diagram is already complete in the HTML when this runs: every layer, the
 * rail, and the figure at its final value. This file hides those pieces and
 * brings them back in order. If it never loads, or Anime.js fails, or the
 * visitor prefers reduced motion, the finished diagram is what stays on
 * screen — the same contract session.js and typewriter.js keep.
 *
 * The sequence is the argument, which is why it runs bottom-up: the foundation
 * exists first, the value travels through it, and the layer a business can own
 * is the one that lands last and is the only one that gets a flourish.
 *
 * Anime.js is imported on first sight of the figure, never before. A visitor
 * who does not scroll this far pays nothing for it.
 */

import { motionAllowed, pageVisible } from "./motion.js";

const RISE_MS = 520;
const STAGGER_MS = 90;
const COUNT_MS = 1400;

/** Resolve the first time `element` is meaningfully on screen. */
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
    }, { rootMargin: "0px 0px -15% 0px" });
    observer.observe(element);
  });
}

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

export function initLayers(root = document) {
  const figure = root.querySelector("[data-layers]");
  if (figure === null) return;

  const stack = [...figure.querySelectorAll("[data-layer-name]")];
  if (stack.length === 0) return;

  const rail = figure.querySelector("[data-layers-rail]");
  const counter = figure.querySelector("[data-layers-count]");
  const top = figure.querySelector("[data-layer-yours]");

  // Reduced motion keeps the finished diagram exactly as it was served.
  if (!motionAllowed()) return;

  // The markup lists the layers top-down so they read correctly; the animation
  // wants them bottom-up, because that is the order the argument goes in.
  const bottomUp = [...stack].reverse();
  const finalFigure = counter === null ? "" : counter.textContent;

  /** Whatever happens, end on the state the server sent. */
  function settle() {
    for (const layer of stack) {
      layer.style.opacity = "";
      layer.style.transform = "";
    }
    if (rail !== null) {
      rail.style.opacity = "";
      rail.style.transform = "";
    }
    if (counter !== null) counter.textContent = finalFigure;
    figure.removeAttribute("data-layers-playing");
  }

  async function run() {
    await whenSeen(figure);
    await whenVisible();

    const { default: anime } = await import("../vendor/anime.es.js");

    // Only now is the finished diagram given up for the animation. Doing this
    // before the import lands would blank the figure for the length of the
    // download, which on a slow connection is the whole visit.
    figure.setAttribute("data-layers-playing", "");
    for (const layer of stack) layer.style.opacity = "0";
    if (rail !== null) rail.style.transform = "scaleY(0)";
    if (counter !== null) counter.textContent = "0×";

    const timeline = anime.timeline({ easing: "easeOutQuad" });

    // 1. The stack builds from the foundation up.
    timeline.add({
      targets: bottomUp,
      opacity: [0, 1],
      translateY: [14, 0],
      delay: anime.stagger(STAGGER_MS),
      duration: RISE_MS,
    });

    // 2. The value travels up through it.
    if (rail !== null) {
      timeline.add({
        targets: rail,
        scaleY: [0, 1],
        opacity: [0, 1],
        duration: RISE_MS + STAGGER_MS * stack.length,
        easing: "easeInOutQuad",
      }, STAGGER_MS * 2);
    }

    // 3. The layer you own is the only one that lands.
    if (top !== null) {
      timeline.add({
        targets: top,
        scale: [1, 1.035, 1],
        duration: 620,
      }, `-=${RISE_MS * 0.5}`);
    }

    // 4. And the figure counts up to exactly what the source says.
    if (counter !== null) {
      const ticker = { value: 0 };
      timeline.add({
        targets: ticker,
        value: 1500,
        duration: COUNT_MS,
        easing: "easeOutExpo",
        update: () => {
          counter.textContent = `${Math.round(ticker.value).toLocaleString("en-US")}×`;
        },
        complete: () => {
          // Never leave a rounded approximation of a cited number on screen.
          counter.textContent = finalFigure;
        },
      }, `-=${COUNT_MS * 0.6}`);
    }

    await timeline.finished;
    figure.removeAttribute("data-layers-playing");
  }

  void run().catch(settle);
}
