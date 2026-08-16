/**
 * splash.js — show the launch offer once, to somebody who is actually reading.
 *
 * The dialog is already in the HTML, closed. This file decides when to open it
 * and remembers that it did. If this module never runs, no modal ever appears —
 * which is the right outcome for a visitor without JavaScript, who would have
 * no way to dismiss one.
 *
 * Two conditions, both required: six seconds have passed *and* the reader is a
 * quarter of the way down. Requiring the scroll is what keeps this outside
 * Google's "intrusive interstitial" rule, which is aimed at popups that cover
 * the content of a page arriving from search. Nobody who bounces in three
 * seconds ever sees it, on a phone or anywhere else.
 *
 * `showModal()` brings focus containment, Escape, the backdrop and focus
 * restoration with it. None of that is worth hand-rolling — nav.js only does so
 * because a full-screen menu is not a dialog.
 */

const SEEN_KEY = "pmd.promo.seen";
const DELAY_MS = 6000;
const SCROLL_FRACTION = 0.25;

/**
 * Storage is a privilege, not a given: Safari's private mode and a locked-down
 * browser both throw on access. Failing closed here means the offer is shown at
 * most once per visit rather than never, which is the kinder way to be wrong.
 */
function seen() {
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

function remember() {
  try {
    localStorage.setItem(SEEN_KEY, new Date().toISOString());
  } catch {
    // Nothing to do. It will be offered again next visit.
  }
}

/** How far down the page the reader has come, 0 to 1. */
function scrolledFraction() {
  const reachable = document.documentElement.scrollHeight - globalThis.innerHeight;
  return reachable <= 0 ? 1 : globalThis.scrollY / reachable;
}

export function initSplash(root = document) {
  const dialog = root.querySelector("[data-splash]");
  if (dialog === null) return;

  // No showModal, no modal: an old browser gets the page without it rather
  // than a dialog it cannot close.
  if (typeof dialog.showModal !== "function") return;
  if (seen()) return;

  const html = document.documentElement;
  let waited = false;
  let read = false;
  let opened = false;

  const timer = setTimeout(() => {
    waited = true;
    attempt();
  }, DELAY_MS);

  function onScroll() {
    if (scrolledFraction() < SCROLL_FRACTION) return;
    read = true;
    attempt();
  }

  function attempt() {
    if (opened || !waited || !read) return;

    // Never over the top of the full-screen menu: it is a modal too, and the
    // one the visitor opened deliberately wins. The scroll listener stays
    // attached, so this simply tries again later.
    if (root.querySelector("[data-nav-panel][data-open]") !== null) return;

    opened = true;
    clearTimeout(timer);
    globalThis.removeEventListener("scroll", onScroll);

    html.setAttribute("data-splash-open", "");
    dialog.showModal();

    // Shown is shown. Recording here rather than on dismissal means a visitor
    // who navigates away from an open dialog is still not shown it again.
    remember();
  }

  globalThis.addEventListener("scroll", onScroll, { passive: true });

  // Clicking the backdrop targets the dialog itself; clicking the card does not.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  // Fires for the close button, the dismiss button and Escape alike.
  dialog.addEventListener("close", () => {
    html.removeAttribute("data-splash-open");
  });
}
