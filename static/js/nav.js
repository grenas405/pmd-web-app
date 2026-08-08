/**
 * nav.js — the masthead: mobile disclosure, scrolled state, current section.
 *
 * The navigation is plain anchor links that work without this file. Everything
 * here is an enhancement on top of markup that is already correct.
 */

export function initNav(root = document) {
  const masthead = root.querySelector("[data-sticky]");
  const toggle = root.querySelector("[data-nav-toggle]");
  const panel = root.querySelector("#site-nav");
  if (masthead === null) return;

  /* --- mobile disclosure --- */
  if (toggle !== null && panel !== null) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      if (open) panel.setAttribute("data-open", "");
      else panel.removeAttribute("data-open");
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    panel.addEventListener("click", (event) => {
      if (event.target instanceof HTMLAnchorElement) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      setOpen(false);
      toggle.focus();
    });
  }

  /* --- hairline appears once the page has moved --- */
  const onScroll = () => {
    if (globalThis.scrollY > 24) masthead.setAttribute("data-scrolled", "");
    else masthead.removeAttribute("data-scrolled");
  };
  onScroll();
  globalThis.addEventListener("scroll", onScroll, { passive: true });

  /* --- mark the section currently in view --- */
  const links = [...root.querySelectorAll("[data-nav-link]")];
  const targets = new Map();
  for (const link of links) {
    const id = link.getAttribute("href")?.slice(1);
    if (id === undefined || id === "") continue;
    const section = document.getElementById(id);
    if (section !== null) targets.set(section, link);
  }
  if (targets.size === 0 || !("IntersectionObserver" in globalThis)) return;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const link = targets.get(entry.target);
      if (link === undefined) continue;
      if (entry.isIntersecting) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  }, { rootMargin: "-45% 0px -50% 0px" });

  for (const section of targets.keys()) observer.observe(section);
}
