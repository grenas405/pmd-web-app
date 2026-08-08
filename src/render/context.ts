/**
 * context.ts — everything a template is allowed to know about the server.
 *
 * Renderers take this as a parameter instead of importing configuration, so a
 * page is a pure function of (context, data) and can be rendered in a test
 * without a server, a socket or an environment.
 */

export interface RenderContext {
  /** Canonical absolute origin, e.g. "https://pedromdominguez.dev". */
  readonly origin: string;
  /** Site-relative asset path -> fingerprinted public URL. */
  readonly asset: (path: string) => string;
  /** Pre-serialised JSON-LD, admitted by the CSP through its hash. */
  readonly jsonLd: string;
}
