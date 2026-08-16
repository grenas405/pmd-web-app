/**
 * nav.js — the masthead: the full-screen menu, scrolled state, current section.
 *
 * The links are plain anchors and they are in the page whether this file runs
 * or not. What this file adds is the menu they live inside on a phone: the
 * stylesheet only hides them behind a button once the inline flag in <head>
 * says a script is running, so nothing here is load-bearing for navigation.
 */

import { motionAllowed } from "./motion.js";

const STAGGER_MS = 60;
/** Kept in step with the clip-path transition in site.css. */
const WIPE_MS = 460;

/** Opened and closed as a unit: nothing here half-applies. */
function createMenu(toggle, panel, masthead) {
  const items = [...panel.querySelectorAll("[data-nav-item]")];
  const sweep = panel.querySelector("[data-nav-sweep]");
  const root = document.documentElement;

  // Everything outside the menu, made inert while it is open. The browser's
  // own focus containment is better than any Tab loop written here.
  const outside = [...document.querySelectorAll("main, footer")];

  let anime = null;
  let timeline = null;
  let open = false;

  /** The state the panel must end in, animation or no animation. */
  function settle() {
    for (const item of items) {
      item.style.opacity = "";
      item.style.transform = "";
    }
    if (sweep !== null) {
      sweep.style.opacity = "";
      sweep.style.transform = "";
    }
  }

  async function play() {
    if (!motionAllowed()) return;

    // Loaded on first open, never before: a visitor who does not open the menu
    // should not pay for the animation library that decorates it.
    if (anime === null) {
      anime = (await import("../vendor/anime.es.js")).default;
    }

    timeline?.pause();

    // The wipe itself is a CSS transition on the panel's clip-path, fired by
    // [data-open]. Anime.js does not interpolate polygon() — it would snap
    // between shapes — while the browser tweens two polygons of equal vertex
    // count natively. What is left here is what Anime.js is good at: numbers.
    timeline = anime.timeline({ easing: "easeOutQuad" });

    if (sweep !== null) {
      timeline.add({
        targets: sweep,
        opacity: [0, 1, 0.55],
        scaleX: [0, 1],
        duration: 420,
        easing: "easeOutExpo",
      }, WIPE_MS * 0.45);
    }

    timeline.add({
      targets: items,
      opacity: [0, 1],
      translateY: [18, 0],
      delay: anime.stagger(STAGGER_MS),
      duration: 420,
    }, WIPE_MS * 0.6);

    await timeline.finished;
  }

  function setOpen(next) {
    if (next === open) return;
    open = next;

    toggle.setAttribute("aria-expanded", String(open));
    if (open) panel.setAttribute("data-open", "");
    else panel.removeAttribute("data-open");

    // The masthead's scrolled state carries a backdrop-filter, and a
    // backdrop-filter makes an element the containing block for its
    // position: fixed descendants — this panel among them. Left in place, the
    // menu stops filling the viewport and bands across the header instead.
    // The stylesheet drops the filter while this attribute is set.
    masthead.toggleAttribute("data-menu-open", open);

    // The page behind holds still, and cannot be reached by Tab.
    if (open) root.setAttribute("data-nav-locked", "");
    else root.removeAttribute("data-nav-locked");
    for (const element of outside) element.inert = open;

    if (!open) {
      timeline?.pause();
      timeline = null;
      settle();
      toggle.focus();
      return;
    }

    // Hide the pieces the timeline is about to bring in, but only when there
    // is going to be a timeline — otherwise the menu would open empty.
    if (motionAllowed()) {
      for (const item of items) item.style.opacity = "0";
      if (sweep !== null) sweep.style.opacity = "0";
    }

    items[0]?.querySelector("a")?.focus({ preventScroll: true });

    // A menu that only opens when its animation succeeds is not a menu. Any
    // failure lands on the finished state instead.
    void play().catch(() => settle());
  }

  return { setOpen, isOpen: () => open };
}

export function initNav(root = document) {
  const masthead = root.querySelector("[data-sticky]");
  const toggle = root.querySelector("[data-nav-toggle]");
  const panel = root.querySelector("#site-nav");
  if (masthead === null) return;

  /* --- the menu --- */
  if (toggle !== null && panel !== null) {
    const menu = createMenu(toggle, panel, masthead);

    toggle.addEventListener("click", () => menu.setOpen(!menu.isOpen()));

    panel.addEventListener("click", (event) => {
      if (!(event.target instanceof HTMLElement)) return;
      // A link takes the visitor somewhere; the close button just puts the
      // page back. Both end with the menu shut.
      if (event.target.closest("a") !== null || event.target.closest("[data-nav-close]") !== null) {
        menu.setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.isOpen()) menu.setOpen(false);
    });

    // Growing past the breakpoint turns the menu back into a masthead row; an
    // open panel left over from a narrow window would take the lock with it.
    globalThis.matchMedia("(min-width: 60rem)").addEventListener("change", (event) => {
      if (event.matches) menu.setOpen(false);
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
    // Parsed, not sliced: these hrefs are `/#work` so they resolve from any
    // page, and chopping the first character would leave "#work" here and
    // quietly stop the current-section marking from ever matching.
    const id = new URL(link.href, globalThis.location.href).hash.slice(1);
    if (id === "") continue;
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
