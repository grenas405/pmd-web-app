/**
 * coderain.js — pseudo-code scrolling behind the sign-in panel.
 *
 * The lines are assembled here from a token set rather than served from a file:
 * nothing real is shipped to an unauthenticated page, the variety is endless,
 * and there is no extra request. It is decoration and marked aria-hidden, so
 * nothing is lost when it does not run.
 *
 * It stops when the password field takes focus. A field of moving text behind
 * the thing you are typing into is the kind of flourish that stops being
 * charming the second it costs somebody an attempt.
 */

import { motionAllowed, pageVisible } from "./motion.js";

const FONT = '12px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const LINE_HEIGHT = 18;
const SPEED = 0.35; // pixels per millisecond, upward
const FRAME_MS = 1000 / 30; // 30fps is plenty and leaves the CPU alone

const KEYWORDS = [
  "const",
  "await",
  "export",
  "function",
  "return",
  "if",
  "for",
  "type",
  "interface",
  "async",
];
const NAMES = [
  "request",
  "response",
  "session",
  "record",
  "handler",
  "origin",
  "payload",
  "token",
  "schema",
  "result",
  "entries",
  "config",
];
const CALLS = [
  "parse",
  "verify",
  "resolve",
  "encode",
  "derive",
  "render",
  "collect",
  "match",
  "commit",
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** One plausible-looking line. Syntactically shaped, semantically nothing. */
function line() {
  switch (Math.floor(Math.random() * 5)) {
    case 0:
      return `${pick(KEYWORDS)} ${pick(NAMES)} = await ${pick(CALLS)}(${pick(NAMES)});`;
    case 1:
      return `if (${pick(NAMES)}.${pick(CALLS)}()) return ${pick(NAMES)};`;
    case 2:
      return `for (const ${pick(NAMES)} of ${pick(NAMES)}) {`;
    case 3:
      return `  ${pick(NAMES)}: ${pick(CALLS)}(${Math.floor(Math.random() * 999)}),`;
    default:
      return `${pick(KEYWORDS)} ${pick(NAMES)}(${pick(NAMES)}: ${pick(NAMES)}) {`;
  }
}

export function initCodeRain(root = document) {
  const canvas = root.querySelector("[data-coderain]");
  if (canvas === null || typeof canvas.getContext !== "function") return;

  const context = canvas.getContext("2d");
  if (context === null) return;

  let columns = [];
  let width = 0;
  let height = 0;

  function layout() {
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.font = FONT;

    const perColumn = Math.ceil(height / LINE_HEIGHT) + 2;
    const count = Math.max(1, Math.floor(width / 260));
    columns = Array.from({ length: count }, (_, index) => ({
      x: 18 + index * 260,
      offset: Math.random() * LINE_HEIGHT,
      lines: Array.from({ length: perColumn }, line),
    }));
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    for (const column of columns) {
      column.lines.forEach((text, index) => {
        const y = height - (index * LINE_HEIGHT - column.offset);
        if (y < -LINE_HEIGHT || y > height + LINE_HEIGHT) return;
        // Fading upward: newest at the bottom, dissolving as it rises.
        context.fillStyle = `rgba(217, 178, 95, ${Math.max(0, 0.22 - (y / height) * 0.18)})`;
        context.fillText(text, column.x, y);
      });
    }
  }

  layout();
  draw();

  // Reduced motion keeps the field, still. It is texture either way.
  if (!motionAllowed()) return;

  let last = 0;
  let frame = 0;
  let stopped = false;

  function tick(now) {
    if (stopped) return;
    if (!pageVisible()) {
      frame = requestAnimationFrame(tick);
      return;
    }
    if (now - last >= FRAME_MS) {
      const step = (now - last) * SPEED;
      last = now;
      for (const column of columns) {
        column.offset += step;
        while (column.offset >= LINE_HEIGHT) {
          column.offset -= LINE_HEIGHT;
          column.lines.pop();
          column.lines.unshift(line());
        }
      }
      draw();
    }
    frame = requestAnimationFrame(tick);
  }

  frame = requestAnimationFrame(tick);

  function stop() {
    stopped = true;
    cancelAnimationFrame(frame);
    draw();
  }

  // Typing wins over decoration, every time.
  root.querySelector("[data-signin-input]")?.addEventListener("focus", stop, { once: true });

  globalThis.addEventListener("resize", () => {
    layout();
    draw();
  }, { passive: true });
}
