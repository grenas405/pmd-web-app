/**
 * simple.ts — the short pages: thank-you, 404, and the generic failure page.
 *
 * They share one narrow layout. Error pages deliberately say nothing about
 * what went wrong internally: no status detail beyond the code, no path, no
 * exception text.
 */

import { type Html, html } from "../render/html.ts";
import type { RenderContext } from "../render/context.ts";
import { layout } from "../render/layout.ts";
import { arrowSvg } from "../render/marks.ts";
import { site } from "../content/site.ts";

interface NoticeOptions {
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly actions: Html;
}

function notice(options: NoticeOptions): Html {
  return html`
    <section class="notice">
      <p class="notice__eyebrow">${options.eyebrow}</p>
      <h1 class="notice__title">${options.title}</h1>
      <p class="notice__body">${options.body}</p>
      <div class="notice__actions">${options.actions}</div>
    </section>
  `;
}

export function renderThanks(context: RenderContext): Html {
  return layout(
    context,
    {
      title: `Message received — ${site.name}`,
      description: "Your message reached Pedro M. Dominguez in Oklahoma City.",
      path: "/thank-you",
    },
    notice({
      eyebrow: "Received",
      title: "Your message is in.",
      body: "I read every one myself and usually reply within one business day. If it is urgent, " +
        `email ${site.email} directly and it will reach the same inbox.`,
      actions: html`
        <a class="button button--solid" href="/">Back to the site ${arrowSvg()}</a>
        <a class="button button--ghost" href="/#work">Look at the work</a>
      `,
    }),
  );
}

export function renderNotFound(context: RenderContext): Html {
  return layout(
    context,
    {
      title: `Page not found — ${site.name}`,
      description: "That page does not exist.",
      path: "/404",
      full: false,
    },
    notice({
      eyebrow: "404",
      title: "There is nothing at this address.",
      body:
        "The page you asked for does not exist. Everything on this site lives on one page, so " +
        "the way back is short.",
      actions:
        html`<a class="button button--solid" href="/">Go to the front page ${arrowSvg()}</a>`,
    }),
  );
}

export function renderError(context: RenderContext, status: number, statusText: string): Html {
  return layout(
    context,
    {
      title: `${status} — ${site.name}`,
      description: "The request could not be completed.",
      path: "/error",
      full: false,
    },
    notice({
      eyebrow: String(status),
      title: statusText,
      body: `If this keeps happening, email ${site.email} and tell me what you were doing. The ` +
        "failure is already recorded on my side.",
      actions:
        html`<a class="button button--solid" href="/">Back to the front page ${arrowSvg()}</a>`,
    }),
  );
}
