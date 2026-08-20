/**
 * simple.ts — the short pages: thank-you, 404, and the generic failure page.
 *
 * They share one narrow layout. The public error page deliberately says nothing
 * about what went wrong internally: no status detail beyond the code, no path,
 * no exception text — only an incident code, which is meaningless to anyone
 * without the journal and precise to anyone with it.
 *
 * `renderErrorDetail` is the exception, and it is only ever reached by a request
 * carrying a valid admin session. There is nobody to leak to: the reader is the
 * person holding the password, and telling them the truth on screen is the
 * difference between "I get a 500" and a file and a line number.
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

/** What went wrong, as far as a signed-in reader is concerned. */
export interface ErrorDetail {
  readonly name: string;
  readonly message: string;
  readonly stack: readonly string[];
  readonly method: string;
  readonly path: string;
}

export function renderError(
  context: RenderContext,
  status: number,
  statusText: string,
  code?: string,
): Html {
  // The phone, not the email: texting is the advertised channel, and the code
  // is short precisely so it survives being typed into a text message.
  const reach = `text me at ${context.contact.phone}`;
  const body = status >= 500
    ? `Something went wrong on my end — nothing you did caused it. If you were in the middle of ` +
      `something, ${reach} and I will sort it out` +
      (code === undefined ? "." : `, quoting ${code}.`)
    : `That request could not be completed. If you think it should have been, ${reach}` +
      (code === undefined ? "." : ` and quote ${code}.`);

  return layout(
    context,
    {
      title: `${status} — ${site.name}`,
      description: "The request could not be completed.",
      path: "/error",
      full: false,
    },
    notice({
      eyebrow: code === undefined ? String(status) : `${status} · ${code}`,
      title: statusText,
      body,
      actions:
        html`<a class="button button--solid" href="/">Back to the front page ${arrowSvg()}</a>`,
    }),
  );
}

/**
 * The same failure, told to the one person who can act on it.
 *
 * Reached only behind a valid session. This is what removes the SSH round trip:
 * the stack is on the screen that reported the problem.
 */
export function renderErrorDetail(
  context: RenderContext,
  status: number,
  statusText: string,
  code: string,
  detail: ErrorDetail,
): Html {
  const frames = detail.stack.length === 0
    ? html`<p class="notice__body">No stack was captured.</p>`
    : html`<pre class="notice__trace"><code>${detail.stack.join("\n")}</code></pre>`;

  return layout(
    context,
    {
      title: `${status} ${code} — ${site.name}`,
      description: "The request could not be completed.",
      path: "/error",
      full: false,
    },
    html`
      <section class="notice">
        <p class="notice__eyebrow">${status} · ${code}</p>
        <h1 class="notice__title">${statusText}</h1>
        <p class="notice__body">
          <strong>${detail.name}:</strong> ${detail.message}
        </p>
        <p class="notice__meta">${detail.method} ${detail.path}</p>
        ${frames}
        <p class="notice__meta">
          The full record, including anything trimmed here:
          <code>journalctl -u pmd-web --output cat | grep ${code}</code>
        </p>
        <div class="notice__actions">
          <a class="button button--solid" href="/admin/dashboard">Back to the dashboard</a>
        </div>
      </section>
    `,
  );
}
