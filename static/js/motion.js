/**
 * motion.js — one answer to "may I animate?", shared by every other module.
 *
 * The query is live, so a visitor who turns on "reduce motion" mid-visit is
 * respected without a reload.
 */

const query = globalThis.matchMedia("(prefers-reduced-motion: reduce)");

/** True when the visitor has not asked for reduced motion. */
export function motionAllowed() {
  return !query.matches;
}

/** Run `callback(allowed)` now and again whenever the preference changes. */
export function onMotionPreference(callback) {
  callback(motionAllowed());
  query.addEventListener("change", () => callback(motionAllowed()));
}

/** True while the tab is visible; animations should idle when it is not. */
export function pageVisible() {
  return document.visibilityState === "visible";
}
