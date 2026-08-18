/**
 * admin_dashboard.ts — the enquiries desk, and the four fields that may change.
 *
 * Built from the site's own tokens rather than a second design: this is the
 * same person's tool, and it should feel like the same software. Pure, like
 * every page here.
 */

import { type Html, html } from "../render/html.ts";
import type { RenderContext } from "../render/context.ts";
import { layout } from "../render/layout.ts";
import type { ContactDetails } from "../content/site.ts";
import { defaultContact } from "../content/site.ts";
import type { InquiryRecord } from "../contact/store.ts";

export interface DashboardState {
  readonly inquiries: ReadonlyArray<{ id: string; record: InquiryRecord }>;
  readonly contact: ContactDetails;
  readonly overridden: boolean;
  readonly contactError?: string;
  /** The enquiry awaiting a second confirmation before deletion. */
  readonly confirmDelete?: string;
}

/** "3 hours ago". Rendered server-side so it needs no script. */
function age(iso: string): string {
  const then = new Date(iso).getTime();
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function stat(value: string, label: string): Html {
  return html`
    <div class="stat">
      <span class="stat__value">${value}</span>
      <span class="stat__label">${label}</span>
    </div>
  `;
}

function enquiry(entry: { id: string; record: InquiryRecord }, confirming: boolean): Html {
  const { record } = entry;
  const state = record.state ?? "open";
  return html`
    <article class="lead lead--${state}" id="lead-${entry.id}">
      <header class="lead__head">
        <div>
          <p class="lead__name">
            ${record.name}
            ${record.company === ""
              ? html``
              : html`<span class="lead__co">${record.company}</span>`}
          </p>
          <p class="lead__meta">
            <a href="mailto:${record.email}">${record.email}</a>
            <span class="lead__kind lead__kind--${record.kind}">${record.kind}</span>
            ${record.plan === null ? html`` : html`<span class="lead__plan">${record.plan}</span>`}
            <span>${age(record.receivedAt)}</span>
          </p>
        </div>
        <span class="lead__state">${state}</span>
      </header>

      <p class="lead__message">${record.message}</p>

      <form class="lead__actions" method="post" action="/admin/enquiry">
        <input type="hidden" name="id" value="${entry.id}" />
        ${confirming
          // Two steps, done on the server. An inline onclick would be blocked
          // by the policy — it has no unsafe-inline — so the confirmation
          // would silently never appear and the delete would go straight
          // through. This asks properly, and works with no JavaScript at all.
          ? html`
            <span class="lead__confirm">Delete permanently? The message does not come back.</span>
            <button class="lead__action lead__action--danger" name="action" value="delete-confirm"
              type="submit">Yes, delete</button>
            <button class="lead__action" name="action" value="cancel" type="submit">Cancel</button>
          `
          : html`
            ${state === "handled"
              ? html`<button class="lead__action" name="action" value="open" type="submit">
                Reopen
              </button>`
              : html`<button class="lead__action" name="action" value="handled" type="submit">
                Mark handled
              </button>`}
            <button class="lead__action" name="action" value="archived" type="submit">
              Archive
            </button>
            <button class="lead__action lead__action--danger" name="action" value="delete"
              type="submit">Delete</button>
          `}
      </form>
    </article>
  `;
}

function contactForm(state: DashboardState): Html {
  const field = (
    name: keyof ContactDetails,
    label: string,
    value: string,
    fallback: string,
  ): Html =>
    html`
      <label class="adminfield">
        <span class="adminfield__label">${label}</span>
        <input class="adminfield__input" name="${name}" value="${value}" required />
        <span class="adminfield__default">committed: ${fallback}</span>
      </label>
    `;

  return html`
    <section class="adminpanel" id="contact">
      <h2 class="adminpanel__title">Contact details</h2>
      <p class="adminpanel__note">
        The only content this dashboard changes. These appear in the footer, the contact section and
        the structured data search engines read — saving rewrites all three together.
        ${state.overridden
          ? html`<strong>Currently overridden.</strong>`
          : html`Currently showing the committed values.`}
      </p>

      ${state.contactError === undefined
        ? html``
        : html`<p class="signin__error" role="alert">${state.contactError}</p>`}

      <form class="adminform" method="post" action="/admin/contact">
        ${field("email", "Email", state.contact.email, defaultContact.email)}
        ${field("phone", "Phone", state.contact.phone, defaultContact.phone)}
        ${field("phoneHref", "Phone link", state.contact.phoneHref, defaultContact.phoneHref)}
        ${field("phoneNote", "Note", state.contact.phoneNote, defaultContact.phoneNote)}
        <div class="adminform__actions">
          <button class="button button--solid" type="submit">Save</button>
          ${state.overridden
            ? html`<button class="button button--ghost" name="action" value="reset" type="submit">
              Reset to committed
            </button>`
            : html``}
        </div>
      </form>
    </section>
  `;
}

export function renderDashboard(context: RenderContext, state: DashboardState): Html {
  const open = state.inquiries.filter((entry) => (entry.record.state ?? "open") === "open");
  const archived = state.inquiries.filter((entry) => entry.record.state === "archived");
  const pricing = state.inquiries.filter((entry) => entry.record.kind === "pricing");
  const visible = state.inquiries.filter((entry) => entry.record.state !== "archived");

  const main = html`
    <div class="admin">
      <header class="admin__bar">
        <p class="admin__brand">PMD <span>· admin</span></p>
        <form method="post" action="/admin/signout">
          <button class="admin__signout" type="submit">Sign out</button>
        </form>
      </header>

      <div class="stats">
        ${stat(String(state.inquiries.length), "enquiries")}
        ${stat(String(open.length), "open")}
        ${stat(String(pricing.length), "from pricing")}
        ${stat(String(archived.length), "archived")}
      </div>

      <section class="adminpanel">
        <h2 class="adminpanel__title">Enquiries</h2>
        ${visible.length === 0
          ? html`<p class="adminpanel__note">Nothing yet. New enquiries appear here as they arrive.</p>`
          : html`<div class="leads">${
            visible.map((entry) => enquiry(entry, entry.id === state.confirmDelete))
          }</div>`}
      </section>

      ${contactForm(state)}
    </div>
  `;

  return layout(
    context,
    {
      title: "Admin",
      description: "Administration.",
      path: "/admin/dashboard",
      full: false,
      chrome: false,
    },
    main,
  );
}
