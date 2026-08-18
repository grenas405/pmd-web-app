/**
 * context.ts — everything a template is allowed to know about the server.
 *
 * Renderers take this as a parameter instead of importing configuration, so a
 * page is a pure function of (context, data) and can be rendered in a test
 * without a server, a socket or an environment.
 */

import type { ContactDetails } from "../content/site.ts";

export interface RenderContext {
  /** Canonical absolute origin, e.g. "https://pedromdominguez.dev". */
  readonly origin: string;
  /** Site-relative asset path -> fingerprinted public URL. */
  readonly asset: (path: string) => string;
  /**
   * Pre-serialised JSON-LD, admitted by the CSP through its hash.
   *
   * Read through a getter rather than frozen at boot: the contact details are
   * inside this graph, so editing them in the admin area changes it — and the
   * hash the policy admits has to change with it.
   */
  readonly jsonLd: string;
  /** Contact details in force: committed defaults plus any admin override. */
  readonly contact: ContactDetails;
}
