/**
 * reveal.js — fade sections in as they arrive.
 *
 * The hiding is applied by script, and only to elements that are below the
 * fold when the page loads. Nothing that is already visible is ever hidden, so
 * there is no flash and no content that depends on JavaScript to appear.
 */

import { motionAllowed } from "./motion.js";

export function initReveal(root = document) {
  if (!motionAllowed() || !("IntersectionObserver" in globalThis)) return;

  const candidates = [...root.querySelectorAll("main > .section, .project, .card")];
  const below = candidates.filter((element) =>
    element.getBoundingClientRect().top > globalThis.innerHeight * 0.9
  );
  if (below.length === 0) return;

  for (const element of below) element.setAttribute("data-reveal", "");

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.setAttribute("data-revealed", "");
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -12% 0px" });

  for (const element of below) observer.observe(element);
}
