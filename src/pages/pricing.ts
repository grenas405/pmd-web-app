/**
 * pricing.ts — one plan, its arithmetic, and the comparison that justifies it.
 *
 * Pure, like every other page: a function of (context, data). Every number on
 * the page comes from `src/content/pricing.ts`, and the first-year total is
 * computed there rather than written here, so the page cannot contradict its
 * own maths.
 */

import { type Html, html } from "../render/html.ts";
import type { RenderContext } from "../render/context.ts";
import { layout } from "../render/layout.ts";
import { arrowSvg } from "../render/marks.ts";
import { site } from "../content/site.ts";
import {
  comparison,
  headline,
  included,
  notIncluded,
  plan,
  PLAN_ID,
  sources,
} from "../content/pricing.ts";
import { faq } from "../content/faq.ts";

const money = (amount: number) => `$${amount.toLocaleString("en-US")}`;

function sectionLabel(index: string, text: string): Html {
  return html`
    <p class="label">
      <span class="label__index">${index}</span>
      <span class="label__rule" aria-hidden="true"></span>
      <span class="label__text">${text}</span>
    </p>
  `;
}

/** The plan, and the year-one total spelled out rather than left as homework. */
function planCard(): Html {
  return html`
    <div class="plan">
      <div class="plan__head">
        <p class="plan__name">${plan.name}</p>
        <p class="plan__price">
          <span class="plan__amount">${money(plan.build)}</span>
          <span class="plan__unit">to build and launch</span>
        </p>
        <p class="plan__care">
          then <strong>${money(plan.care)}/month</strong> for care, support and hosting
        </p>
      </div>

      <table class="plan__math">
        <caption class="plan__caption">Your first year, in full</caption>
        <tbody>
          <tr>
            <th scope="row">Build and launch — ${plan.termMonths}-month agreement</th>
            <td>${money(plan.build)}</td>
          </tr>
          <tr>
            <th scope="row">
              Care and support — ${money(plan.care)} × ${String(plan.termMonths)}
            </th>
            <td>${money(plan.care * plan.termMonths)}</td>
          </tr>
          <tr>
            <th scope="row">Domain registration and management</th>
            <td>included</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">First year, all in</th>
            <td>${money(plan.firstYear)}</td>
          </tr>
        </tfoot>
      </table>

      <p class="plan__after">
        Every year after that is <strong>${money(plan.perYearAfter)}</strong> — the same
        ${money(plan.care)} a month — plus the domain renewal at cost, usually around $20. There is
        no second build fee, ever.
      </p>

      <div class="plan__actions">
        <a class="button button--solid" href="/?plan=${PLAN_ID}#contact">
          Start a project ${arrowSvg()}
        </a>
        <a class="button button--ghost" href="${site.phoneHref}">
          Text ${site.phone}
        </a>
      </div>
      <p class="plan__note">${site.phoneNote} — I answer texts faster than calls.</p>
    </div>
  `;
}

function comparisonSection(): Html {
  return html`
    <section class="section" id="comparison" aria-labelledby="comparison-title">
      ${sectionLabel("02", "The comparison")}
      <h2 class="section__title" id="comparison-title">
        The same website, priced two ways.
      </h2>
      <p class="section__lede">
        These are published 2026 ranges for the industry, not quotes from any particular firm. They
        are what a small business is typically asked to pay for work of this kind.
      </p>

      <div class="compare__scroll">
        <table class="compare">
          <thead>
            <tr>
              <th scope="col">What you are buying</th>
              <th scope="col">Typically</th>
              <th scope="col">Here</th>
            </tr>
          </thead>
          <tbody>
            ${comparison.map((row) =>
              html`
                <tr>
                  <th scope="row">
                    ${row.label}
                    <sup class="compare__ref">${String(row.source + 1)}</sup>
                  </th>
                  <td class="compare__typical">${row.typical}</td>
                  <td class="compare__here">${row.here}</td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>

      <p class="compare__claim">
        Against the cheapest published first year, this is <strong>${headline.multiple}</strong> of
        the price — and ${headline.people}.
      </p>

      <ol class="compare__sources">
        ${sources.map((source) =>
          html`
            <li>
              <a href="${source.url}" rel="noopener nofollow">${source.label}</a>
              — ${source.note}
            </li>
          `
        )}
      </ol>
    </section>
  `;
}

function includedSection(): Html {
  return html`
    <section class="section" id="included" aria-labelledby="included-title">
      ${sectionLabel("03", "What you get")}
      <h2 class="section__title" id="included-title">
        Everything below is in the price.
      </h2>
      <div class="included">
        <ul class="included__list">
          ${included.map((item) => html`<li class="included__item">${item}</li>`)}
        </ul>

        <div class="included__not">
          <h3 class="included__not-title">And what is not</h3>
          <ul class="included__not-list">
            ${notIncluded.map((item) => html`<li>${item}</li>`)}
          </ul>
          <p class="included__not-note">
            Said here so it is never a surprise on an invoice.
          </p>
        </div>
      </div>
    </section>
  `;
}

/** The money questions, answered where they are actually being asked. */
function questionsSection(): Html {
  const moneyQuestions = faq.filter((entry) =>
    entry.question.includes("year") || entry.question.includes("leave") ||
    entry.question.includes("cheaper") || entry.question.includes("not included")
  );
  return html`
    <section class="section" id="questions" aria-labelledby="questions-title">
      ${sectionLabel("04", "Before you ask")}
      <h2 class="section__title" id="questions-title">The questions that come next.</h2>
      <dl class="faq">
        ${moneyQuestions.map((entry) =>
          html`
            <div class="faq__item">
              <dt class="faq__question">${entry.question}</dt>
              <dd class="faq__answer">${entry.answer}</dd>
            </div>
          `
        )}
      </dl>
      <p class="section__lede">
        The rest are answered <a href="/#faq">on the main page</a>, or by text.
      </p>
    </section>
  `;
}

export function renderPricing(context: RenderContext): Html {
  const main = html`
    <section class="section section--pricing-hero" aria-labelledby="pricing-title">
      ${sectionLabel("01", "Pricing")}
      <h1 class="section__title section__title--lead" id="pricing-title">
        ${money(plan.build)} to get your business online. ${money(plan.care)} a month to keep it
        there.
      </h1>
      <p class="section__lede">
        One plan, one price, and the whole first year written out below. No proposal process, no
        discovery fee, and nothing that only becomes clear once you have signed.
      </p>
      ${planCard()}
    </section>

    ${comparisonSection()}
    ${includedSection()}
    ${questionsSection()}
  `;

  return layout(
    context,
    {
      title: `Pricing — ${money(plan.build)} to build, ${money(plan.care)}/month — ${site.name}`,
      description:
        `A complete business website for ${money(plan.build)} to build and launch, then ` +
        `${money(plan.care)} a month for care, support and hosting. First year of domain ` +
        `management included — ${money(plan.firstYear)} for the whole first year, in ` +
        `${site.locality}.`,
      path: "/pricing",
    },
    main,
  );
}
