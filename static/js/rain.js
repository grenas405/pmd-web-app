/**
 * rain.js — the stack, falling behind the page.
 *
 * Columns of characters descending with a bright head and a fading tail, the
 * shape borrowed from a Matrix rain. What falls is not noise: each column holds
 * one snippet from `src/content/rain.ts` and shows consecutive characters of it,
 * so reading down a column gives a real line of `jsr:@std/http` rather than
 * confetti. The decoration makes the same argument the page does.
 *
 * It is the last thing on the page that matters, so it behaves like it: lazily
 * imported when the browser is idle, never started when motion is reduced, idle
 * while the tab is hidden, and capped at 30fps because this is a full-viewport
 * canvas on every page and 60fps of it is a phone battery for nothing.
 *
 * The starfield underneath stays until this has actually drawn. `data-rain` on
 * `.sky` is the handover, and CSS cross-fades the two — so a failed import or a
 * thrown frame leaves the background exactly as the server sent it.
 */

import { motionAllowed, pageVisible } from "./motion.js";

const FONT_PX = 12;
const COLUMN_W = 22;
const ROW_H = 18;
const FRAME_MS = 1000 / 30;

// A tail this long at this opacity is deliberately under-tuned. The background
// is described elsewhere in this codebase as "deliberately quiet", and a rain
// that competes with the hero is a novelty rather than an atmosphere.
const TAIL_MIN = 5;
const TAIL_MAX = 20;
const DIM_MIN = 0.05;
const DIM_MAX = 0.18;

/*
 * Pixels per frame, and the frame rate is half the source's. Carrying its 0.5–2.1
 * across unchanged looked broken rather than subtle: at 30fps that is 15–63px a
 * second, so six seconds after load most columns were still above the screen.
 * Doubled, this matches the speed the effect was tuned at.
 */
const SPEED_MIN = 1;
const SPEED_MAX = 3.4;

/** Device pixels per CSS pixel, capped: a 3× phone would paint nine times over. */
const scale = () => Math.min(globalThis.devicePixelRatio || 1, 2);

const random = (min, max) => min + Math.random() * (max - min);

/**
 * The palette, read from the stylesheet rather than repeated here, so retuning
 * the gold in one place moves the rain with it. Falls back to the literals if
 * the tokens are ever renamed.
 */
function palette(root) {
  const style = globalThis.getComputedStyle(root);
  const read = (name, fallback) => {
    const value = style.getPropertyValue(name).trim();
    return value.length > 0 ? value : fallback;
  };
  return {
    head: read("--gold-bright", "#f3d894"),
    tail: read("--gold", "#d9b25f"),
  };
}

/** "#f3d894" -> "243, 216, 148", so an alpha can be applied per character. */
function toRgb(colour) {
  const hex = colour.replace("#", "").trim();
  if (hex.length !== 6) return "217, 178, 95";
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ");
}

function readSnippets(canvas) {
  try {
    const parsed = JSON.parse(canvas.dataset.rainSnippets ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((line) => typeof line === "string") : [];
  } catch {
    return [];
  }
}

export function initRain(root = document) {
  const canvas = root.querySelector(".sky__rain");
  if (canvas === null) return;

  const snippets = readSnippets(canvas);
  if (snippets.length === 0) return;
  if (!motionAllowed()) return;

  const context = canvas.getContext("2d");
  if (context === null) return;

  const sky = canvas.closest(".sky");
  const colours = palette(document.documentElement);
  const headRgb = toRgb(colours.head);
  const tailRgb = toRgb(colours.tail);

  let width = 0;
  let height = 0;
  let drops = [];
  let stopped = false;

  /** A fresh column: a snippet, a place in it, a speed and a brightness. */
  function makeDrop(x, startAbove) {
    const snippet = snippets[Math.floor(Math.random() * snippets.length)];
    return {
      x,
      // Respawning far above the fold leaves the column dark for as long as it
      // takes to fall back — at these speeds, up to half a minute. Close enough
      // to keep a gap, near enough that the field stays populated.
      y: startAbove ? -random(0, height) : -random(0.2, 1.2) * ROW_H * TAIL_MAX,
      speed: random(SPEED_MIN, SPEED_MAX),
      tail: Math.floor(random(TAIL_MIN, TAIL_MAX)),
      dim: random(DIM_MIN, DIM_MAX),
      snippet,
      // Where in the snippet this column currently is. Advancing it as the drop
      // falls is what makes a column read as a line rather than as static.
      offset: Math.floor(Math.random() * snippet.length),
    };
  }

  function resize() {
    const ratio = scale();
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const columns = Math.max(1, Math.floor(width / COLUMN_W));
    drops = Array.from(
      { length: columns },
      (_, i) => makeDrop(i * COLUMN_W + COLUMN_W / 2, true),
    );
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    context.font = `${FONT_PX}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
    context.textAlign = "center";

    for (const drop of drops) {
      drop.y += drop.speed;

      for (let j = 0; j < drop.tail; j++) {
        const y = drop.y - j * ROW_H;
        if (y < -ROW_H || y > height + ROW_H) continue;

        // Minus, not plus. The tail is drawn upward from the head, so advancing
        // the index with j puts later characters higher up and the column reads
        // bottom-to-top — "@std/http" arrives as "ptth/dts@". Walking backwards
        // as we walk up means reading downward gives the line in order.
        const length = drop.snippet.length;
        const index = ((drop.offset - j) % length + length) % length;
        const char = drop.snippet[index];
        if (char === " ") continue;

        // The curve, not a linear ramp: it is what makes this read as a trail
        // rather than as a gradient.
        const fade = Math.pow(1 - j / drop.tail, 1.8);
        context.fillStyle = j === 0
          ? `rgba(${headRgb}, ${Math.min(0.7, drop.dim * 7)})`
          : `rgba(${tailRgb}, ${drop.dim * fade * 5})`;
        context.fillText(char, drop.x, y);
      }

      if (drop.y - drop.tail * ROW_H > height) {
        Object.assign(drop, makeDrop(drop.x, false));
      }
    }
  }

  let last = 0;
  let started = false;

  function frame(now) {
    if (stopped) return;
    globalThis.requestAnimationFrame(frame);

    // Idle rather than stop: the loop stays cheap and picks straight back up.
    if (!pageVisible() || !motionAllowed()) return;
    if (now - last < FRAME_MS) return;
    last = now;

    draw();

    // The handover, after a frame exists rather than before: the starfield only
    // steps back once there is something to step back for.
    if (!started) {
      started = true;
      sky?.setAttribute("data-rain", "");
    }
  }

  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  globalThis.requestAnimationFrame(frame);

  return () => {
    stopped = true;
    observer.disconnect();
    sky?.removeAttribute("data-rain");
  };
}
