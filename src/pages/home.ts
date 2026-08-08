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

function hero(): Html {
  return html`
    <section class="hero" aria-labelledby="hero-title">
      <p class="hero__eyebrow">
        <span class="hero__eyebrow-dot" aria-hidden="true"></span>
        Oklahoma City · Independent Software Engineering
      </p>

      <h1 class="hero__title" id="hero-title">
        <span class="hero__line">One&nbsp;Person.</span>
        <span class="hero__line hero__line--accent">One&nbsp;Paradigm&nbsp;Shift.</span>
      </h1>

      <p class="hero__rotator">
        <span class="hero__rotator-prefix">in</span>
        <span
          class="typewriter"
          data-typewriter
          data-words="${JSON.stringify(site.disciplines)}"
        ><span class="typewriter__text" data-typewriter-text>${site
          .disciplines[0]}</span><span class="typewriter__caret" aria-hidden="true"></span></span>
      </p>

      <p class="hero__lede">
        I design, build, secure and maintain software for Oklahoma City businesses — the whole
        job, by one engineer working with AI, at a pace that used to require an agency.
      </p>

      <div class="hero__actions">
        <a class="button button--solid" href="#contact">Start a project ${arrowSvg()}</a>
        <a class="button button--ghost" href="#work">See the work</a>
      </div>

      <dl class="hero__facts">
        <div class="fact">
          <dt>One</dt>
          <dd>engineer, from the first conversation through years of maintenance</dd>
        </div>
        <div class="fact">
          <dt>Zero</dt>
          <dd>client-side frameworks between your customers and your content</dd>
        </div>
        <div class="fact">
          <dt>OKC</dt>
          <dd>where it is designed, deployed and supported — same time zone, same city</dd>
        </div>
      </dl>
    </section>
  `;
}

/** "Who is Pedro?" — the manifesto, plus the architecture in one line. */
function thesis(): Html {
  const pipeline = ["Internet", "Nginx", "Deno", "Your functions"];
  return html`
    <section class="section section--thesis" id="thesis" aria-labelledby="thesis-title">
      ${sectionLabel("01", "The thesis")}
      <div class="thesis__grid">
        <div class="thesis__body">
          <h2 class="section__title" id="thesis-title">
            Software has been getting heavier. Yours does not have to.
          </h2>
          <p class="prose">
            I am Pedro M. Dominguez. I build business software in Oklahoma City, and I build it
            deliberately small. Most of what makes modern web projects expensive is not the
            problem being solved — it is the machinery bolted around it: build pipelines,
            framework migrations, hundreds of transitive dependencies, and a team large enough to
            keep all of it standing.
          </p>
          <p class="prose">
            Strip that away and something surprising happens. A single engineer with good tools
            and AI assistance can deliver, secure and maintain real systems on a timeline that
            used to require a firm. Not by cutting corners — by removing the parts that were
            never load-bearing.
          </p>
          <p class="prose">
            This site is the argument and the evidence. It is a few hundred lines of TypeScript
            on the Deno runtime, standard library only, no framework, served straight from a
            single process. Read the source; it is the same way I build for clients.
          </p>
        </div>

        <figure class="pipeline" aria-labelledby="pipeline-caption">
          <ol class="pipeline__list">
            ${pipeline.map((stage, index) =>
              html`
                <li class="pipeline__stage">
                  <span class="pipeline__number">${String(index + 1).padStart(2, "0")}</span>
                  <span class="pipeline__name">${stage}</span>
                </li>
              `
            )}
          </ol>
          <figcaption class="pipeline__caption" id="pipeline-caption">
            The entire request path. Four hops, one process, no orchestration layer to operate at
            two in the morning.
          </figcaption>
        </figure>
      </div>
    </section>
  `;
}

/** "What does he build?" */
function capabilitiesSection(): Html {
  return html`
    <section class="section" id="build" aria-labelledby="build-title">
      ${sectionLabel("02", "What I build")}
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
      ${sectionLabel("03", "Approach")}
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
      ${sectionLabel("04", "The advantage")}
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
          <h3 class="project__title" id="project-${project.slug}-title">${project.name}</h3>
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
          <h4 class="project__heading">What was built</h4>
          <p class="prose prose--tight">${project.built}</p>
        </div>
        <div class="project__block">
          <h4 class="project__heading">Architecture</h4>
          <p class="prose prose--tight">${project.architecture}</p>
          <h4 class="project__heading">Why this way</h4>
          <p class="prose prose--tight">${project.rationale}</p>
        </div>
      </div>

      <footer class="project__footer">
        <ul class="project__outcomes">
          ${project.outcome.map((line) =>
            html`<li><span class="project__tick" aria-hidden="true"></span>${line}</li>`
          )}
        </ul>
        <ul class="chips" aria-label="Technologies used in ${project.name}">
          ${project.stack.map((tech) => html`<li class="chip">${tech}</li>`)}
        </ul>
      </footer>
    </article>
  `;
}

function workSection(): Html {
  return html`
    <section class="section section--work" id="work" aria-labelledby="work-title">
      ${sectionLabel("05", "Selected work")}
      <h2 class="section__title" id="work-title">
        Software for the businesses that keep this city running.
      </h2>
      <p class="section__lede">
        Not demos. Systems that a shop, a distributor or a contractor depends on during business
        hours — each one small enough to explain in a paragraph and to maintain for years.
      </p>
      <div class="projects">${projects.map(projectCard)}</div>
    </section>
  `;
}

function processSection(): Html {
  return html`
    <section class="section section--process" id="process" aria-labelledby="process-title">
      ${sectionLabel("06", "Working together")}
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

function contactSection(state: ContactFormState): Html {
  const values = state.values ?? {};
  const errors = state.errors;

  return html`
    <section class="section section--contact" id="contact" aria-labelledby="contact-title">
      ${sectionLabel("07", "Start here")}
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
              minlength="20"
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
export function renderHome(context: RenderContext, state: ContactFormState): Html {
  const main = html`
    ${hero()}
    ${thesis()}
    ${capabilitiesSection()}
    ${approachSection()}
    ${advantageSection()}
    ${workSection()}
    ${processSection()}
    ${contactSection(state)}
  `;
  return layout(context, homeMeta, main);
}
