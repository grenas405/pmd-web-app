/**
 * sky.js — occasional gold shooting stars.
 *
 * This is the one place Anime.js earns its bytes: a meteor is a coordinated
 * translate, rotate, scale and fade with easing, and hand-rolling that timeline
 * would be worse code than importing a library that already does it well.
 *
 * The field is deliberately quiet — a handful of pooled elements, long random
 * gaps, nothing at all when the tab is hidden or motion is reduced.
 */

import anime from "../vendor/anime.es.js";
import { motionAllowed, pageVisible } from "./motion.js";

const POOL_SIZE = 3;
const DESKTOP_GAP = [4200, 12_000];
const MOBILE_GAP = [9000, 22_000];

const random = (min, max) => min + Math.random() * (max - min);

function createMeteor(field) {
  const element = document.createElement("span");
  element.className = "meteor";
  field.append(element);
  return element;
}

/** Animate one meteor across the upper sky and resolve when it is gone. */
function launch(element) {
  const width = globalThis.innerWidth;
  const height = globalThis.innerHeight;
  const angle = random(18, 34);
  const distance = random(width * 0.45, width * 0.85);
  const startX = random(-width * 0.1, width * 0.9);
  const startY = random(-40, height * 0.45);
  const length = random(90, 190);

  element.style.width = `${length}px`;

  return anime({
    targets: element,
    translateX: [startX, startX + distance],
    translateY: [startY, startY + distance * Math.tan((angle * Math.PI) / 180)],
    rotate: angle,
    scaleX: [0.35, 1],
    opacity: [
      { value: 0, duration: 0 },
      { value: 0.9, duration: 180, easing: "easeOutQuad" },
      { value: 0, duration: 520, easing: "easeInQuad" },
    ],
    duration: random(900, 1500),
    easing: "easeOutSine",
  }).finished;
}

export function initSky(root = document) {
  const field = root.querySelector("[data-meteor-field]");
  if (field === null || !motionAllowed()) return;

  const small = globalThis.matchMedia("(max-width: 48rem)").matches;
  const [minGap, maxGap] = small ? MOBILE_GAP : DESKTOP_GAP;
  const pool = Array.from({ length: POOL_SIZE }, () => createMeteor(field));

  let timer = 0;
  let busy = 0;

  // Clearing first makes `schedule` idempotent: waking the tab cannot start a
  // second chain of timers running alongside the first.
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (pageVisible() && motionAllowed() && busy < POOL_SIZE) {
        const element = pool[busy];
        busy += 1;
        try {
          await launch(element);
        } finally {
          busy -= 1;
        }
      }
      schedule();
    }, random(minGap, maxGap));
  }

  schedule();

  document.addEventListener("visibilitychange", () => {
    if (!pageVisible()) {
      clearTimeout(timer);
    } else {
      schedule();
    }
  });
}
