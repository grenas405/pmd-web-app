/**
 * layout.ts — the document shell: head metadata, skip link, header, footer.
 *
 * Pages supply a `<main>` and nothing else. Everything shared — the meta tags,
 * the navigation, the ambient sky layer — is decided once, here.
 */

import { escapeJsonForScript, type Html, html, raw } from "./html.ts";
import type { RenderContext } from "./context.ts";
import { absoluteUrl, nav, site } from "../content/site.ts";
import { markSvg } from "./marks.ts";

export interface PageMeta {
  readonly title: string;
  readonly description: string;
  /** Site-relative path of this page, used for the canonical URL. */
  readonly path: string;
  /** Emit JSON-LD and the ambient background. Off for error pages. */
  readonly full?: boolean;
}

function head(context: RenderContext, meta: PageMeta): Html {
  const canonical = absoluteUrl(context.origin, meta.path);
  const ogImage = absoluteUrl(context.origin, context.asset("/img/og.png"));
  return html`
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="color-scheme" content="dark" />
    <meta name="theme-color" content="#060b18" />
    <meta name="author" content="${site.name}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${site.domain}" />
    <meta property="og:title" content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${ogImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${meta.title}" />
    <meta name="twitter:description" content="${meta.description}" />
    <meta name="twitter:image" content="${ogImage}" />

    <link rel="icon" href="${context.asset("/img/mark.svg")}" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="${context.asset("/img/mark.svg")}" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <!-- Unfingerprinted: this URL must match the one inside site.css exactly,
        or the preload fetches a second copy of the font. -->
    <link
      rel="preload"
      href="/static/vendor/fraunces-latin-var.woff2"
      as="font"
      type="font/woff2"
      crossorigin="anonymous"
    />
    <link rel="stylesheet" href="${context.asset("/css/site.css")}" />
    ${meta.full === false
      ? null
      : html`<script type="application/ld+json">${raw(jsonLdScriptBody(context.jsonLd))}</script>`}
  `;
}

/**
 * The exact text placed inside the JSON-LD element.
 *
 * `main.ts` hashes the output of this function for the Content-Security-Policy,
 * so the escaping and the hash can never drift apart: there is one definition.
 */
export function jsonLdScriptBody(json: string): string {
  return escapeJsonForScript(json);
}

function header(): Html {
  return html`
    <header class="masthead" data-sticky>
      <a class="masthead__mark" href="/" aria-label="${site.name} — home">
        ${markSvg()}
        <span class="masthead__wordmark">
          <span class="masthead__name">${site.name}</span>
          <span class="masthead__meta">${site.domain}</span>
        </span>
      </a>

      <button
        class="masthead__toggle"
        type="button"
        aria-expanded="false"
        aria-controls="site-nav"
        data-nav-toggle
      >
        <span class="masthead__toggle-bars" aria-hidden="true"></span>
        <span class="visually-hidden">Menu</span>
      </button>

      <nav class="masthead__nav" id="site-nav" aria-label="Sections">
        <ul>
          ${nav.map((link) =>
            html`<li><a href="${link.href}" data-nav-link>${link.label}</a></li>`
          )}
        </ul>
        <a class="button button--ghost masthead__cta" href="#contact">Start a project</a>
      </nav>
    </header>
  `;
}

function footer(context: RenderContext): Html {
  const year = new Date().getUTCFullYear();
  return html`
    <footer class="footer">
      <div class="footer__skyline" aria-hidden="true">
        <img src="${context.asset("/img/skyline.svg")}" alt="" width="1600" height="190" />
      </div>
      <div class="footer__inner">
        <p class="footer__statement">
          <span class="footer__statement-lead">One person.</span>
          One paradigm shift in web development — built in ${site.locality}.
        </p>
        <ul class="footer__links">
          <li><a href="mailto:${site.email}">${site.email}</a></li>
          <li>
            <a href="${site.github}" rel="me noopener noreferrer" target="_blank">GitHub</a>
          </li>
          <li><a href="/humans.txt">humans.txt</a></li>
        </ul>
        <p class="footer__fine">
          © ${year} ${site.name}. Served from ${site.locality}, ${site.region} by a single Deno
          process behind Nginx.
        </p>
      </div>
    </footer>
  `;
}

/** Ambient background: static CSS starfield plus a layer JS may animate. */
function sky(): Html {
  return html`
    <div class="sky" aria-hidden="true">
      <div class="sky__stars"></div>
      <div class="sky__glow"></div>
      <div class="sky__meteors" data-meteor-field></div>
    </div>
  `;
}

export function layout(context: RenderContext, meta: PageMeta, main: Html): Html {
  return html`
    <!DOCTYPE html>
    <html lang="en-US">
      <head>${head(context, meta)}</head>
      <body>
      <a class="skip-link" href="#main">Skip to content</a>
      ${meta.full === false ? null : sky()}
      ${header()}
      <main id="main">${main}</main>
      ${footer(context)}
      <script type="module" src="${context.asset("/js/main.js")}"></script>
      </body>
    </html>
  `;
}
