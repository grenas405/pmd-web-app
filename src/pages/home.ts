/**
 * home.ts — the single page, section by section.
 *
 * Each section is a small function returning markup, in the order a visitor
 * asks their questions: who is this, what does he build, why is it built that
 * way, why one person, what has he shipped, and how do we start. The page is a
 * pure function of (context, form state); it opens no files and reads no clock
 * beyond the copyright year in the footer.
 */

import { type Html, html, raw } from "../render/html.ts";
import type { RenderContext } from "../render/context.ts";
import { layout, type PageMeta } from "../render/layout.ts";
import { arrowSvg } from "../render/marks.ts";
import { site } from "../content/site.ts";
import { advantage, capabilities, process, translations } from "../content/narrative.ts";
import { type Project, projects } from "../content/projects.ts";
import { liveSites } from "../content/live.ts";
import { faq } from "../content/faq.ts";
import { headline, plan as pricing, PLAN_ID, type PlanId, splash } from "../content/pricing.ts";
import { layers, modelPriceDrop } from "../content/thesis.ts";
import {
  session,
  type SessionLine,
  sessionPath,
  sessions,
  sessionSummary,
} from "../content/session.ts";
import type { ContactFormState } from "../routes/contact_state.ts";

function sectionLabel(index: string, text: string): Html {
  return html`
    <p class="label">
      <span class="label__index">${index}</span>
      <span class="label__rule" aria-hidden="true"></span>
      <span class="label__text">${text}</span>
    </p>
  `;
}

/**
 * The name, split into words of single letters so the reveal has something to
 * stagger. Done on the server, not in the browser: every script on this page
 * replays a finished document rather than assembling one, and a heading that
 * only exists once JavaScript has run is a heading a crawler never sees.
 *
 * No whitespace between the spans — the array joins with nothing, and a newline
 * here would open a gap inside every word. Pure.
 */
function splitLetters(text: string): Html {
  return html`${
    text.split(" ").map((word) =>
      html`<span class="hero__word">${
        [...word].map((letter) => html`<span class="hero__letter">${letter}</span>`)
      }</span>`
    )
  }`;
}

/**
 * The hero, built on the shape portfolio-app uses: the name, then a ladder of
 * short lines that each answer one question a stranger has — what he does,
 * where he is, what he has shipped, what it costs.
 *
 * Everything here is visible as served. `hero.js` hides pieces and brings them
 * back; if it never runs the visitor gets the finished hero, which is the same
 * contract session.js and layers.js keep.
 */
function hero(): Html {
  const money = `$${pricing.build.toLocaleString("en-US")}`;
  const clientNames = liveSites
    .filter((entry) => entry.host !== site.domain)
    .map((entry) => entry.name);
  return html`
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero__aurora" aria-hidden="true"></div>

      <!-- English is rendered; the rotation swaps in the other four and sets the
          lang attribute with each, so a screen reader that reaches mid-cycle
          pronounces French as French. Cross-fade rather than typed: one blinking
          caret per viewport, and the benefit line below has earned it. -->
      <p class="hero__eyebrow">
        <span class="hero__eyebrow-dot" aria-hidden="true"></span>
        <span
          class="hero__tagline"
          data-typewriter
          data-mode="fade"
          data-words="${JSON.stringify(site.taglines)}"
        ><span
          class="hero__tagline-text"
          data-typewriter-text
          lang="${site.taglines[0].lang}"
        >${site.taglines[0].text}</span></span>
      </p>

      <!-- aria-label so this is announced as a name rather than as eighteen
          separate letters. The visible spans stay for the reveal. -->
      <h1 class="hero__title" id="hero-title" aria-label="${site.name}">
        ${splitLetters(site.name)}
      </h1>

      <p class="hero__role">${site.role}</p>

      <!-- Counted, never typed: the roster in the work section is the source of
          truth, and a hardcoded number here would drift away from it. The city
          is said here and nowhere else in the hero — it was previously in this
          line, the role above it and a location line between the two. -->
      <p class="hero__stats">
        ${liveSites.length} live sites · 1 direct line · No middlemen · Oklahoma City
      </p>

      <div class="hero__divider" aria-hidden="true"></div>

      <p class="hero__rotator">
        <span class="hero__rotator-prefix">Websites that</span>
        <span
          class="typewriter"
          data-typewriter
          data-words="${JSON.stringify(site.disciplines)}"
        ><span class="typewriter__text" data-typewriter-text>${site
          .disciplines[0]}</span><span class="typewriter__caret" aria-hidden="true"></span></span>
      </p>

      <div class="hero__actions">
        <a class="button button--solid" href="/pricing">Get your site built ${arrowSvg()}</a>
        <a class="button button--ghost" href="#work">See the work</a>
      </div>

      <p class="hero__trust">
        Serving OKC small businesses · From <strong>${money}</strong> · You own everything
      </p>

      <!-- The strongest thing on this page is that these are checkable. Derived
          from the roster, with this site filtered out of its own proof, so it
          can never name a site that is not up. -->
      <p class="hero__clients">
        <span class="hero__clients-label">Already running for</span>
        <span class="hero__clients-names">${clientNames.join(" · ")}</span>
      </p>

      <a class="hero__cue" href="#session">
        <span>See how it is built</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 15.586L5.707 9.293 4.293 10.707 12 18.414l7.707-7.707-1.414-1.414z" />
        </svg>
      </a>
    </section>
  `;
}

/**
 * The session, in a section of its own.
 *
 * It used to hang off the bottom of the hero and borrow its heading. Now that
 * the hero fills the viewport it needs both its own room and its own title —
 * and the hero's scroll cue needs somewhere real to land.
 */
function sessionSection(): Html {
  return html`
    <section class="section section--session" id="session" aria-labelledby="session-title">
      ${sectionLabel("01", "How it is built")}
      <h2 class="section__title" id="session-title">
        What building your site actually looks like.
      </h2>
      ${sessionFigure()}
    </section>
  `;
}

/**
 * One transcript line. Pure; the animation only ever re-plays what this emits.
 * The marker is plain text — `>` is escaped to `&gt;` by the template, so it
 * needs no `raw()` and cannot become markup.
 */
function sessionRow(line: SessionLine): Html {
  const marker = line.kind === "prompt" ? ">" : line.kind === "output" ? "✓" : "⏺";
  // The prompt is the one line the animation types out character by character.
  const typed = line.kind === "prompt" ? raw("data-session-typed") : html``;
  return html`
    <li class="session__row session__row--${line.kind}" data-session-row>
      <span class="session__marker" aria-hidden="true">${marker}</span>
      ${line.tool === undefined ? html`` : html`<span class="session__tool">${line.tool}</span>`}
      <span class="session__text" ${typed}>${line.text}</span>
      ${line.detail === undefined
        ? html``
        : html`<span class="session__detail">${line.detail}</span>`}
    </li>
  `;
}

/**
 * The hero's Claude Code session.
 *
 * Every line is rendered here, finished, in the HTML. `session.js` hides them
 * and replays them; if it never runs — no JavaScript, reduced motion, a thrown
 * error — the visitor reads the completed session instead of an empty box.
 */
function sessionFigure(): Html {
  // Only what differs between subjects: the title bar, and a [text, detail]
  // pair per row. The script zips these onto the rows already in the DOM, so
  // the payload stays small and the markup stays the single source of shape.
  const rotation = sessions.map((entry) => ({
    path: entry.path,
    rows: entry.lines.map((line) => [line.text, line.detail ?? null]),
  }));

  return html`
    <figure class="session" data-session data-sessions="${JSON.stringify(rotation)}">
      <div class="session__chrome" aria-hidden="true">
        <span class="session__dots"></span>
        <span class="session__path" data-session-path>${sessionPath}</span>
      </div>

      <ol class="session__body" aria-hidden="true">${session.map(sessionRow)}</ol>
      <p class="visually-hidden">${sessionSummary}</p>

      <figcaption class="session__caption">
        A session, condensed — Claude Code and Codex do the typing. Built on Deno with the JSR
        standard library and Zod, then deployed by one command.
      </figcaption>
    </figure>
  `;
}

/**
 * The offer, made in the middle of the page where a reader who is still here is
 * ready to hear a number. It leads with what they get and lets the arithmetic
 * do the arguing; the comparison and its sources live on /pricing.
 */
function pricingPromo(): Html {
  const money = (amount: number) => `$${amount.toLocaleString("en-US")}`;
  return html`
    <section class="section section--promo" id="pricing" aria-labelledby="promo-title">
      ${sectionLabel("07", "What it costs")}
      <div class="promo">
        <div class="promo__body">
          <h2 class="section__title" id="promo-title">
            Your own software, at ${headline.multiple} of what it used to cost.
          </h2>
          <p class="prose">
            An Oklahoma City business is typically quoted thousands to get a real website built,
            and thousands more every year to keep it running. That price is not the software. It is
            the firm around the software — the account manager, the project manager, the designer,
            the developer and the person who bills you for all four.
          </p>
          <p class="prose">
            Take the firm away and the number changes completely. ${money(pricing.build)} builds
            and launches your site. ${money(pricing.care)} a month keeps it fast, patched, backed
            up and current — and your domain is managed free for the first year. That is
            <strong>${money(pricing.firstYear)} for your entire first year</strong>, from one
            engineer who answers his own phone.
          </p>
          <div class="promo__actions">
            <a class="button button--solid" href="/pricing">See the full pricing ${arrowSvg()}</a>
            <a class="button button--ghost" href="/?plan=${PLAN_ID}#contact">Start a project</a>
          </div>
        </div>

        <dl class="promo__figures">
          <div class="promo__figure">
            <dt>${money(pricing.build)}</dt>
            <dd>to design, build and launch — one time</dd>
          </div>
          <div class="promo__figure">
            <dt>${money(pricing.care)}<span class="promo__per">/mo</span></dt>
            <dd>care, support, hosting and small changes</dd>
          </div>
          <div class="promo__figure">
            <dt>Included</dt>
            <dd>your domain, registered and managed for year one</dd>
          </div>
        </dl>
      </div>
    </section>
  `;
}

/**
 * The questions that otherwise arrive as a text message at 9pm. Rendered from
 * the same data that becomes FAQPage structured data in site.ts, so an answer
 * cannot be improved on the page and left stale in search results.
 */
function faqSection(): Html {
  return html`
    <section class="section section--faq" id="faq" aria-labelledby="faq-title">
      ${sectionLabel("09", "Common questions")}
      <h2 class="section__title" id="faq-title">The things people ask before they text.</h2>
      <dl class="faq">
        ${faq.map((entry) =>
          html`
            <div class="faq__item">
              <dt class="faq__question">${entry.question}</dt>
              <dd class="faq__answer">${entry.answer}</dd>
            </div>
          `
        )}
      </dl>
    </section>
  `;
}

/**
 * The promotional splash.
 *
 * A `<dialog>` with no `open` attribute: closed in every browser, and closed
 * for a visitor with no JavaScript, who therefore never meets a modal they
 * would have no way to dismiss. `splash.js` opens it with `showModal()`, which
 * brings focus trapping, Escape and the backdrop with it — none of which has
 * to be written here.
 *
 * The copy and every figure come from src/content/pricing.ts, so this cannot
 * quote a price the pricing page has stopped charging.
 */
function pricingSplash(): Html {
  const money = (amount: number) => `$${amount.toLocaleString("en-US")}`;
  return html`
    <dialog class="splash" data-splash aria-labelledby="splash-title">
      <form method="dialog" class="splash__dismiss-form">
        <button class="splash__close" type="submit" aria-label="Close this offer">
          <span aria-hidden="true">×</span>
        </button>
      </form>

      <div class="splash__body">
        <p class="splash__eyebrow">
          <span class="splash__dot" aria-hidden="true"></span>
          ${splash.eyebrow}
        </p>
        <h2 class="splash__title" id="splash-title">${splash.title}</h2>
        <p class="splash__lede">${splash.lede}</p>

        <p class="splash__price">
          <span class="splash__amount">${money(pricing.build)}</span>
          <span class="splash__unit">to build and launch</span>
          <span class="splash__care">then ${money(pricing.care)}/month</span>
        </p>
        <p class="splash__total">
          ${money(pricing.firstYear)} for your whole first year, domain included.
        </p>

        <ul class="splash__points">
          ${splash.points.map((point) =>
            html`<li><span class="splash__tick" aria-hidden="true"></span>${point}</li>`
          )}
        </ul>

        <div class="splash__actions">
          <a class="button button--solid" href="/pricing">${splash.cta} ${arrowSvg()}</a>
          <form method="dialog">
            <button class="button button--ghost" type="submit">${splash.dismiss}</button>
          </form>
        </div>
      </div>
    </dialog>
  `;
}

/**
 * The argument, in short. The long version, with its citations and its
 * objections, is at /thesis — this is the version a business owner can read
 * standing up, and the figure beside it is the argument rather than decoration.
 */
function thesis(): Html {
  return html`
    <section class="section section--thesis" id="thesis" aria-labelledby="thesis-title">
      ${sectionLabel("02", "The thesis")}
      <div class="thesis__grid">
        <div class="thesis__body">
          <h2 class="section__title" id="thesis-title">
            The clever part got cheap. The part that is yours did not.
          </h2>
          <p class="prose">
            Running an AI model costs about ${modelPriceDrop.label} less than it did six years ago,
            and no company holds a lead in it for long. When the clever part becomes cheap, the
            valuable part becomes the part nobody else has: how your business actually works — your
            customers, your prices, your schedule, the small decisions your staff make without
            thinking.
          </p>
          <p class="prose">
            That is the layer a local business can own. For years owning it was out of reach,
            because building anything custom cost tens of thousands of dollars, so everyone rented
            software built for the average of ten thousand other businesses and shaped their work
            around it. AI has changed what that costs.
          </p>
          <p class="prose">
            So this is the offer, plainly: software built around how you already work, that you
            own — the code, the data, the domain — rather than rent by the month from somebody who
            can change the terms.
          </p>
          <div class="promo__actions">
            <a class="button button--solid" href="/thesis">Read the full argument ${arrowSvg()}</a>
          </div>
        </div>

        ${layerStack()}
      </div>
    </section>
  `;
}

/**
 * The six layers of the AI economy, bottom to top, with the one a business can
 * own at the top of the stack.
 *
 * Served finished — every layer, the rail and the final figure are in this
 * markup. `layers.js` hides those pieces and replays them; if it never runs,
 * or Anime.js fails to load, or the visitor prefers reduced motion, what stays
 * on screen is the completed diagram. The layers themselves come from the
 * research cited on /thesis, not from imagination.
 */
function layerStack(): Html {
  return html`
    <figure class="layers" data-layers aria-labelledby="layers-caption">
      <div class="layers__rail" data-layers-rail aria-hidden="true"></div>
      <ol class="layers__list">
        ${[...layers].reverse().map((layer) =>
          html`
            <li
              class="layers__layer${layer.yours === true ? " layers__layer--yours" : ""}"
              data-layer-name
              ${layer.yours === true ? raw("data-layer-yours") : html``}
            >
              <span class="layers__name">${layer.name}</span>
              <span class="layers__gloss">${layer.gloss}</span>
              ${layer.yours === true ? html`<span class="layers__badge">Yours</span>` : html``}
            </li>
          `
        )}
      </ol>
      <figcaption class="layers__caption" id="layers-caption">
        Running a model costs
        <span class="layers__figure" data-layers-count>${modelPriceDrop.label}</span>
        less than it did six years ago. The value moves to the top of the stack — the only layer
        your business can own.
      </figcaption>
    </figure>
  `;
}

/** "What does he build?" */
function capabilitiesSection(): Html {
  return html`
    <section class="section" id="build" aria-labelledby="build-title">
      ${sectionLabel("03", "What I build")}
      <h2 class="section__title" id="build-title">
        Practical systems for businesses that run on them.
      </h2>
      <div class="cards">
        ${capabilities.map((item) =>
          html`
            <article class="card">
              <h3 class="card__title">${item.title}</h3>
              <p class="card__body">${item.body}</p>
            </article>
          `
        )}
      </div>
    </section>
  `;
}

/** "Why does this architecture matter to businesses?" */
function approachSection(): Html {
  return html`
    <section class="section section--approach" id="approach" aria-labelledby="approach-title">
      ${sectionLabel("04", "Approach")}
      <h2 class="section__title" id="approach-title">
        Every engineering decision, translated into what it costs you or saves you.
      </h2>
      <ul class="translations">
        ${translations.map((item) =>
          html`
            <li class="translation">
              <p class="translation__decision">${item.decision}</p>
              <p class="translation__arrow" aria-hidden="true">→</p>
              <p class="translation__consequence">${item.consequence}</p>
            </li>
          `
        )}
      </ul>
    </section>
  `;
}

/** "How can one developer compete with an agency?" */
function advantageSection(): Html {
  return html`
    <section class="section section--advantage" id="advantage" aria-labelledby="advantage-title">
      ${sectionLabel("05", "The advantage")}
      <h2 class="section__title" id="advantage-title">
        An agency has more people. That was only ever an advantage when software required more
        people.
      </h2>
      <div class="advantage__grid">
        ${advantage.map((item) =>
          html`
            <article class="advantage__item">
              <h3 class="advantage__title">${item.decision}</h3>
              <p class="advantage__body">${item.consequence}</p>
            </article>
          `
        )}
      </div>
      <p class="advantage__closer">
        The result is not a smaller version of an agency engagement. It is a different shape: less
        surface area, fewer meetings, and a system you could hand to another engineer tomorrow
        without an archaeology budget.
      </p>
    </section>
  `;
}

function projectCard(project: Project): Html {
  return html`
    <article class="project" id="project-${project.slug}" aria-labelledby="project-${project
      .slug}-title">
      <header class="project__header">
        <div class="project__identity">
          <h3 class="project__title" id="project-${project.slug}-title">
            <a class="project__link" href="${project.href}" rel="noopener">${project.name}</a>
          </h3>
          <p class="project__summary">${project.summary}</p>
        </div>
        <p class="project__meta">
          <span class="project__sector">${project.sector}</span>
          <span class="project__year">${project.year}</span>
        </p>
      </header>

      <div class="project__grid">
        <div class="project__block">
          <h4 class="project__heading">The problem</h4>
          <p class="prose prose--tight">${project.problem}</p>
        </div>
        <div class="project__block">
          <h4 class="project__heading">What it does</h4>
          <p class="prose prose--tight">${project.built}</p>
        </div>
      </div>

      <footer class="project__footer">
        <div class="project__changed">
          <h4 class="project__heading">What changed</h4>
          <ul class="project__outcomes">
            ${project.outcome.map((line) =>
              html`<li><span class="project__tick" aria-hidden="true"></span>${line}</li>`
            )}
          </ul>
        </div>
        <div class="project__stack">
          <h4 class="project__heading">Built with</h4>
          <ul class="chips" aria-label="Built with, for ${project.name}">
            ${project.stack.map((tech) => html`<li class="chip">${tech}</li>`)}
          </ul>
        </div>
      </footer>
    </article>
  `;
}

/**
 * The sites that are up right now. The count is the argument: one engineer
 * keeping several businesses online is a fact a visitor can check by clicking,
 * which is worth more than any adjective in the paragraph above it.
 */
function liveRoster(): Html {
  return html`
    <div class="roster">
      <p class="roster__heading">
        <span class="roster__pulse" aria-hidden="true"></span>
        Running right now
      </p>
      <ul class="roster__list">
        ${liveSites.map((entry) =>
          html`
            <li class="roster__item">
              <a class="roster__link" href="https://${entry.host}" rel="noopener">${entry.name}</a>
              <span class="roster__sector">${entry.sector}</span>
              <span class="roster__host">${entry.host}</span>
            </li>
          `
        )}
      </ul>
      <p class="roster__note">
        ${String(liveSites.length)} sites · one engineer · one small server in Oklahoma City. That
        is only possible because each one is small and built the same way.
      </p>
    </div>
  `;
}

function workSection(): Html {
  return html`
    <section class="section section--work" id="work" aria-labelledby="work-title">
      ${sectionLabel("06", "Selected work")}
      <h2 class="section__title" id="work-title">
        Software for the businesses that keep this city running.
      </h2>
      <p class="section__lede">
        Not demos. Two Oklahoma City organisations that depend on this software during business
        hours — a roofing company and a church — each small enough to explain in a paragraph, and
        each one click away if you want to check it.
      </p>
      ${liveRoster()}
      <div class="projects">${projects.map(projectCard)}</div>
    </section>
  `;
}

function processSection(): Html {
  return html`
    <section class="section section--process" id="process" aria-labelledby="process-title">
      ${sectionLabel("08", "Working together")}
      <h2 class="section__title" id="process-title">Four steps, no discovery-phase invoice.</h2>
      <ol class="steps">
        ${process.map((step) =>
          html`
            <li class="step">
              <p class="step__index" aria-hidden="true">${step.index}</p>
              <div class="step__body">
                <h3 class="step__title">${step.title}</h3>
                <p class="step__duration">${step.duration}</p>
                <p class="step__text">${step.body}</p>
              </div>
            </li>
          `
        )}
      </ol>
    </section>
  `;
}

type Errors = Readonly<Record<string, string>> | undefined;

function fieldError(errors: Errors, field: string): Html {
  const message = errors?.[field];
  if (message === undefined) return html``;
  return html`<p class="field__error" id="${field}-error">${message}</p>`;
}

/** Emit the invalid-state attributes only when there is an error to point at. */
function errorAttrs(errors: Errors, field: string): Html {
  if (errors?.[field] === undefined) return html``;
  return raw(`aria-invalid="true" aria-describedby="${field}-error"`);
}

function contactSection(state: ContactFormState, plan?: PlanId): Html {
  const values = state.values ?? {};
  const errors = state.errors;

  return html`
    <section class="section section--contact" id="contact" aria-labelledby="contact-title">
      ${sectionLabel("10", "Start here")}
      <div class="contact__grid">
        <div class="contact__intro">
          <h2 class="section__title" id="contact-title">
            Tell me what is slowing your business down.
          </h2>
          <p class="prose">
            The first conversation is free and it is with me — not a salesperson. Describe the
            part of your day that runs on paper, a whiteboard or a spreadsheet nobody trusts, and
            I will tell you honestly whether software is the answer.
          </p>
          <ul class="contact__direct">
            <li>
              <span class="contact__direct-label">Text</span>
              <a href="${site.phoneHref}">${site.phone}</a>
              <span class="contact__direct-note">${site.phoneNote}</span>
            </li>
            <li>
              <span class="contact__direct-label">Email</span>
              <a href="mailto:${site.email}">${site.email}</a>
            </li>
            <li>
              <span class="contact__direct-label">Code</span>
              <a href="${site.github}" rel="noopener noreferrer" target="_blank">
                github.com/grenas405
              </a>
            </li>
            <li>
              <span class="contact__direct-label">Based in</span>
              <span>${site.locality}, ${site.regionName}</span>
            </li>
          </ul>
        </div>

        <form
          class="contact__form"
          method="post"
          action="/api/contact"
          data-contact-form
          data-fallback-email="${site.email}"
          novalidate
        >
          ${plan === undefined ? html`` : html`<input type="hidden" name="plan" value="${plan}" />`}
          <p
            class="form__status form__status--${state.status}"
            role="status"
            data-form-status
            ${state.status === "idle" ? html`hidden` : html``}
          >${state.message ?? ""}</p>

          <div class="field">
            <label class="field__label" for="contact-name">Name</label>
            <input
              class="field__input"
              id="contact-name"
              name="name"
              type="text"
              autocomplete="name"
              maxlength="120"
              required
              value="${values.name ?? ""}"
              ${errorAttrs(errors, "name")}
            />
            ${fieldError(errors, "name")}
          </div>

          <div class="field">
            <label class="field__label" for="contact-email">Email</label>
            <input
              class="field__input"
              id="contact-email"
              name="email"
              type="email"
              autocomplete="email"
              maxlength="254"
              required
              value="${values.email ?? ""}"
              ${errorAttrs(errors, "email")}
            />
            ${fieldError(errors, "email")}
          </div>

          <div class="field">
            <label class="field__label" for="contact-company">
              Business <span class="field__optional">optional</span>
            </label>
            <input
              class="field__input"
              id="contact-company"
              name="company"
              type="text"
              autocomplete="organization"
              maxlength="120"
              value="${values.company ?? ""}"
              ${errorAttrs(errors, "company")}
            />
            ${fieldError(errors, "company")}
          </div>

          <div class="field">
            <label class="field__label" for="contact-message">What is the problem?</label>
            <textarea
              class="field__input field__input--area"
              id="contact-message"
              name="message"
              rows="6"
              maxlength="4000"
              required
              ${errorAttrs(errors, "message")}
            >${values.message ?? ""}</textarea>
            ${fieldError(errors, "message")}
          </div>

          <div class="honeypot" aria-hidden="true">
            <label for="contact-website">Leave this field empty</label>
            <input id="contact-website" name="website" type="text" tabindex="-1" autocomplete="off" />
          </div>

          <button class="button button--solid button--block" type="submit">
            Send it ${arrowSvg()}
          </button>
          <p class="form__note">
            Submissions are validated on the server, stored on my own machine, and never shared.
            No tracking scripts run on this page.
          </p>
        </form>
      </div>
    </section>
  `;
}

export const homeMeta: PageMeta = {
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  path: "/",
};

/** Render the whole page. `state` reflects a non-JavaScript form submission. */
export function renderHome(
  context: RenderContext,
  state: ContactFormState,
  plan?: PlanId,
): Html {
  const main = html`
    ${hero()}
    ${sessionSection()}
    ${thesis()}
    ${capabilitiesSection()}
    ${approachSection()}
    ${advantageSection()}
    ${workSection()}
    ${pricingPromo()}
    ${processSection()}
    ${faqSection()}
    ${contactSection(state, plan)}
  `;
  return layout(context, homeMeta, main, pricingSplash());
}
