/**
 * marks.ts — the few inline SVGs the page uses.
 *
 * Inline rather than linked so they inherit `currentColor` and cost no
 * request. Decorative marks carry `aria-hidden`; nothing here conveys meaning
 * that is not already in the surrounding text.
 */

import { type Html, html } from "./html.ts";

/** The meridian mark: a compass diamond crossed by a tower line. */
export function markSvg(): Html {
  return html`
    <svg class="mark" viewBox="0 0 32 32" role="img" aria-hidden="true" focusable="false">
      <path d="M16 1.5 30.5 16 16 30.5 1.5 16Z" fill="none" stroke="currentColor" stroke-width="1.1" />
      <path d="M16 8.5 23.5 16 16 23.5 8.5 16Z" fill="currentColor" opacity=".22" />
      <path d="M16 4.5V27.5M6.5 16h19" stroke="currentColor" stroke-width=".8" opacity=".55" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" />
    </svg>
  `;
}

/** A short arrow used on links and buttons. */
export function arrowSvg(): Html {
  return html`
    <svg class="arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"
        stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}
