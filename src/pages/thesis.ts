/**
 * thesis.ts — the long argument, for the reader who wants the evidence.
 *
 * Written for a business owner, not an engineer. The terms the citations use —
 * "application layer", "commoditised" — are introduced once in plain words and
 * then the plain words do the work.
 *
 * Pure, like every page here: a function of (context, data).
 */

import { type Html, html } from "../render/html.ts";
import type { RenderContext } from "../render/context.ts";
import { layout } from "../render/layout.ts";
import { arrowSvg } from "../render/marks.ts";
import { site } from "../content/site.ts";
import { plan, PLAN_ID } from "../content/pricing.ts";
import { contrast, modelPriceDrop, objections, quote, sources, spine } from "../content/thesis.ts";

function sectionLabel(index: string, text: string): Html {
  return html`
    <p class="label">
      <span class="label__index">${index}</span>
      <span class="label__rule" aria-hidden="true"></span>
      <span class="label__text">${text}</span>
    </p>
  `;
}

/** A superscript pointing at the source list at the bottom of the page. */
function cite(index: number): Html {
  return html`<sup class="cite"><a href="#sources">${String(index + 1)}</a></sup>`;
}

function whatChanged(): Html {
  return html`
    <section class="section" id="shift" aria-labelledby="shift-title">
      ${sectionLabel("01", "What changed")}
      <h1 class="section__title section__title--lead" id="shift-title">
        The clever part got cheap. The part that is yours did not.
      </h1>
      <p class="section__lede">
        For most of the last decade, the expensive thing about software was the software. That is
        ending, and it changes what a small business can own.
      </p>

      <div class="prose-column">
        <p class="prose">
          The cost of running an AI model has fallen about
          <strong>${modelPriceDrop.label}</strong> in six years${cite(modelPriceDrop.source)}, and
          the lead any one company holds now lasts weeks rather than years — publish a result and
          rivals match it almost immediately. Intelligence is turning into something you buy by the
          gallon, like electricity.
        </p>
        <p class="prose">
          When the clever part becomes cheap, the valuable part becomes the part nobody else has:
          how <em>your</em> business actually works. Your customers, your prices, your schedule,
          the fifteen small decisions your staff make without thinking. In the industry that is
          called the <strong>application layer</strong> — the software a business actually touches.
          It is the one layer a roofer or a church can genuinely own.
        </p>

        <figure class="quote">
          <blockquote class="quote__text">${quote.text}</blockquote>
          <figcaption class="quote__by">
            ${quote.speaker} — ${quote.where}${cite(quote.source)}
          </figcaption>
        </figure>

        <p class="prose">
          Two honest notes about that quotation. It says the application layer <em>and</em> the
          infrastructure below — both, and the second half matters as much as the first. And he is
          describing where investors should expect value to sit, not arguing that your business
          should own its software. That second step is mine, and the rest of this page is me making
          it rather than borrowing his authority for it.
        </p>
      </div>
    </section>
  `;
}

function rentOrOwn(): Html {
  return html`
    <section class="section" id="own" aria-labelledby="own-title">
      ${sectionLabel("02", "Renting or owning")}
      <h2 class="section__title" id="own-title">Two ways to have software.</h2>
      <p class="section__lede">
        Almost every business in Oklahoma City is on the first path, usually without having chosen
        it. The second one only became affordable recently.
      </p>

      <div class="contrast">
        ${contrast.map((path) =>
          html`
            <article class="contrast__path${path.owned ? " contrast__path--owned" : ""}">
              <h3 class="contrast__title">${path.title}</h3>
              <ol class="contrast__steps">
                ${path.steps.map((step) => html`<li class="contrast__step">${step}</li>`)}
              </ol>
              <p class="contrast__ends">${path.ends}</p>
            </article>
          `
        )}
      </div>

      <div class="prose-column">
        <p class="prose">
          Renting is not a swindle. It was the only thing that made sense when building anything
          custom cost tens of thousands of dollars — far better to split the cost of one product
          between ten thousand businesses. The price of that bargain is that the software is built
          for the average of those ten thousand, and you shape your business around it: you change
          how you take bookings because that is how the software takes bookings.
        </p>
        <p class="prose">
          What has changed is the cost of the alternative. Building software specific to one
          business used to be the expensive path. It is becoming the affordable one, and the thing
          you get at the end is an asset rather than a receipt.
        </p>
      </div>
    </section>
  `;
}

function notEliminated(): Html {
  return html`
    <section class="section" id="commoditised" aria-labelledby="commoditised-title">
      ${sectionLabel("03", "Cheap is not worthless")}
      <h2 class="section__title" id="commoditised-title">
        None of this means the rest of it stops mattering.
      </h2>
      <div class="prose-column">
        <p class="prose">
          It would be easy to overstate this argument, so here is the limit of it. Chips, data
          centres, power, databases and the models themselves are not becoming worthless — the same
          research that describes models getting cheap calls infrastructure
          <em>“the most concentrated layer in the stack”</em>${cite(1)}, and the sentence quoted
          above puts real value below as well as above.
        </p>
        <p class="prose">
          The claim is narrower, and it survives being pushed on. AI has collapsed the cost of
          <em>assembling</em> software — the plumbing, the forms, the tests, the tedious parts.
          What is left, proportionally, is the part that is specific to one business. So a larger
          share of the value ends up in the layer a business can own, even while everything
          underneath it stays valuable and stays rented.
        </p>
      </div>
    </section>
  `;
}

function foundation(): Html {
  const pipeline = ["Internet", "Nginx", "Deno", "Your functions"];
  return html`
    <section class="section" id="foundation" aria-labelledby="foundation-title">
      ${sectionLabel("04", "What it is built on")}
      <h2 class="section__title" id="foundation-title">
        A foundation small enough to read is a foundation you can leave.
      </h2>
      <p class="section__lede">
        This is where the technical choices earn their place — not because they are clever, but
        because of what they cost you later.
      </p>

      <div class="thesis__grid">
        <div class="prose-column">
          <p class="prose">
            The software runs on <strong>Deno</strong>, an open-source runtime that starts with
            permission to do nothing at all and has to be handed each capability explicitly. The
            web server is <strong>@std/http</strong> from the JSR standard library. Every piece of
            information arriving from outside is checked by <strong>Zod</strong> before anything
            else sees it. Beyond that it uses what the runtime already provides rather than reaching
            for a framework, and it is built the way Unix tools are: small pieces, each doing one
            job, that you can understand one at a time.
          </p>
          <p class="prose">
            The economic argument is the one that matters to you. A foundation you can read is a
            foundation you can leave — no vendor can re-price it, discontinue it, or decide your
            business is no longer a priority. There is nothing underneath it that expires and forces
            a rewrite in three years. And because the plumbing is small and standard, AI handles
            almost all of it, which frees the effort for the only part that is actually yours: how
            your business works.
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

function theObjections(): Html {
  return html`
    <section class="section" id="objections" aria-labelledby="objections-title">
      ${sectionLabel("05", "The objections")}
      <h2 class="section__title" id="objections-title">
        Everything wrong with what I have just argued.
      </h2>
      <p class="section__lede">
        If these are not answered honestly, nothing above them is worth reading. Some of them I can
        answer. One or two I can only concede.
      </p>

      <dl class="objections">
        ${objections.map((entry) =>
          html`
            <div class="objection">
              <dt class="objection__q">${entry.objection}</dt>
              <dd class="objection__a">
                ${entry.answer}${entry.source === undefined ? html`` : cite(entry.source)}
              </dd>
            </div>
          `
        )}
      </dl>
    </section>
  `;
}

function sourcesSection(): Html {
  return html`
    <section class="section" id="sources" aria-labelledby="sources-title">
      ${sectionLabel("06", "Sources")}
      <h2 class="section__title" id="sources-title">Where every number here came from.</h2>
      <p class="section__lede">
        Each one was read at the source rather than taken from a summary. Where a claim could not be
        confirmed — an episode number, in one case — it is not stated.
      </p>
      <ol class="sources">
        ${sources.map((source) =>
          html`
            <li class="sources__item">
              <a class="sources__link" href="${source.url}" rel="noopener nofollow">
                ${source.label}
              </a>
              <span class="sources__note">${source.note}</span>
            </li>
          `
        )}
      </ol>
    </section>
  `;
}

export function renderThesis(context: RenderContext): Html {
  const main = html`
    ${whatChanged()}
    ${rentOrOwn()}
    ${notEliminated()}
    ${foundation()}
    ${theObjections()}
    ${sourcesSection()}

    <section class="section section--spine" aria-labelledby="spine-title">
      <h2 class="section__title" id="spine-title">The whole argument, in three steps.</h2>
      <ol class="spine">
        ${spine.map((step, index) =>
          html`
            <li class="spine__step">
              <span class="spine__index" aria-hidden="true">${String(index + 1)}</span>
              <span class="spine__text">${step}</span>
            </li>
          `
        )}
      </ol>
      <p class="section__lede">
        A local business does not have to be only a customer of the AI economy. It can own the
        software through which AI does its work.
      </p>
      <div class="promo__actions">
        <a class="button button--solid" href="/pricing">What that costs ${arrowSvg()}</a>
        <a class="button button--ghost" href="/?plan=${PLAN_ID}#contact">Start a project</a>
      </div>
    </section>
  `;

  return layout(
    context,
    {
      title: `Own the software, not the subscription — ${site.name}`,
      description:
        "As AI makes models cheap, the value in software moves to the layer a business actually " +
        `owns: its own workflows, data and customers. Why that makes custom software affordable ` +
        `for an Oklahoma City business at $${plan.build} rather than tens of thousands.`,
      path: "/thesis",
    },
    main,
  );
}
