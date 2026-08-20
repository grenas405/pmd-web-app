/**
 * app.ts — the route table and the one function that turns a Request into a
 * Response.
 *
 * Everything cross-cutting happens here, once, in a fixed order: method
 * screening, routing, handler dispatch, error containment, security headers,
 * access logging. Handlers stay ignorant of all of it.
 */

import type { Config } from "./config.ts";
import type { Logger } from "./log.ts";
import { type Handler, matchRoutes, type Route, route, SUPPORTED_METHODS } from "./http/router.ts";
import { type SecurityOptions, withSecurityHeaders } from "./http/security.ts";
import { serveStatic } from "./http/static.ts";
import { createRateLimiter } from "./http/ratelimit.ts";
import {
  CACHE_NONE,
  CACHE_PAGE,
  htmlResponse,
  jsonResponse,
  statusMessage,
  textResponse,
} from "./http/respond.ts";
import type { Html } from "./render/html.ts";
import type { RenderContext } from "./render/context.ts";
import { renderHome } from "./pages/home.ts";
import {
  type ErrorDetail,
  renderError,
  renderErrorDetail,
  renderNotFound,
  renderThanks,
} from "./pages/simple.ts";
import { newIncidentCode } from "./incident.ts";
import { currentSession } from "./admin/auth.ts";
import { IDLE_FORM } from "./routes/contact_state.ts";
import { renderPricing } from "./pages/pricing.ts";
import { renderThesis } from "./pages/thesis.ts";
import type { ContactStore } from "./admin/contact.ts";
import { adminRoutes } from "./routes/admin.ts";
import { PLAN_ID, type PlanId } from "./content/pricing.ts";

/** The plan named in `?plan=`, if we offer it. Anything else is ignored. */
function planFromQuery(url: URL): PlanId | undefined {
  return url.searchParams.get("plan") === PLAN_ID ? PLAN_ID : undefined;
}
import { createContactHandler } from "./routes/contact.ts";
import { humansTxt, manifestJson, robotsTxt, sitemapXml } from "./routes/meta.ts";

export interface AppDeps {
  readonly config: Config;
  readonly logger: Logger;
  readonly render: RenderContext;
  readonly security: SecurityOptions;
  readonly startedAt: Date;
  readonly kv: Deno.Kv;
  readonly contact: ContactStore;
}

/**
 * The page that cannot fail, because it is a string.
 *
 * Reached only when rendering the real failure page also threw. It exists so a
 * broken layout degrades to something ugly and useful rather than to a blank
 * 503 with the incident code lost.
 */
function lastResort(code: string): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Something went wrong</title>` +
      `<body style="font:16px system-ui;margin:4rem auto;max-width:32rem;padding:0 1rem">` +
      `<h1>Something went wrong on my end.</h1>` +
      `<p>Nothing you did caused it. Quote <strong>${code}</strong> if you tell me about it.</p>` +
      `<p><a href="/">Back to the front page</a></p>`,
    {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    },
  );
}

/** Admin paths get the admin-flavoured failure page, 4xx included. */
function isAdminPath(url: URL): boolean {
  return url.pathname === "/admin" || url.pathname.startsWith("/admin/");
}

/**
 * A refused admin request: logged with a code like a crash, and shown the same
 * page a crash would show. A 405 telling the owner to email himself was the
 * whole complaint; there is no stack here, but the method and path are the part
 * that was actually missing.
 */
async function rejected(
  deps: AppDeps,
  request: Request,
  url: URL,
  status: number,
): Promise<Response> {
  const code = newIncidentCode();
  deps.logger.warn("request.rejected", {
    incident: code,
    status,
    method: request.method,
    path: url.pathname,
  });
  const detail: ErrorDetail = {
    name: `HTTP ${status}`,
    message: statusMessage(status),
    stack: [],
    method: request.method,
    path: url.pathname,
  };
  return htmlResponse(await renderFailure(deps, request, status, code, detail), {
    status,
    cacheControl: CACHE_NONE,
  });
}

/**
 * Which failure page a request gets.
 *
 * A signed-in admin gets the truth; everyone else gets a code and a phone
 * number. Deciding means reading the session out of KV — inside an error
 * handler, which is the one place that must not assume storage works. If the
 * lookup throws, the public page is served: when the database is what broke,
 * this must not break on top of it.
 */
async function renderFailure(
  deps: AppDeps,
  request: Request,
  status: number,
  code: string,
  detail?: ErrorDetail,
): Promise<Html> {
  try {
    const session = await currentSession(deps.kv, request);
    if (session !== null && detail !== undefined) {
      return renderErrorDetail(deps.render, status, statusMessage(status), code, detail);
    }
  } catch {
    // Deliberately silent: the failure already being handled is the interesting
    // one, and a second log line here would only bury it.
  }
  return renderError(deps.render, status, statusMessage(status), code);
}

/** An Error reduced to what the developer page shows. Pure. */
function detailOf(error: unknown, request: Request, path: string): ErrorDetail {
  const thrown = error instanceof Error ? error : new Error(String(error));
  return {
    name: thrown.name,
    message: thrown.message,
    stack: (thrown.stack ?? "").split("\n").slice(1, 9).map((line) => line.trim())
      .filter((line) => line.length > 0),
    method: request.method,
    path,
  };
}

function buildRoutes(deps: AppDeps): readonly Route[] {
  const limiter = createRateLimiter({
    limit: deps.config.contactRateLimit,
    windowMs: deps.config.contactRateWindowSeconds * 1000,
  });

  const contact = createContactHandler({
    config: deps.config,
    logger: deps.logger,
    limiter,
    render: deps.render,
    kv: deps.kv,
  });

  const page = (render: () => Response): Handler => () => render();

  return [
    route("GET", "/", ({ url }) =>
      htmlResponse(
        // Arriving from the pricing page carries the plan through in the query
        // string, so the hidden field survives with JavaScript switched off.
        renderHome(deps.render, IDLE_FORM, planFromQuery(url)),
      )),
    route(
      "GET",
      "/thesis",
      page(() => htmlResponse(renderThesis(deps.render), { cacheControl: CACHE_PAGE })),
    ),
    route(
      "GET",
      "/pricing",
      page(() => htmlResponse(renderPricing(deps.render), { cacheControl: CACHE_PAGE })),
    ),
    route(
      "GET",
      "/thank-you",
      page(() => htmlResponse(renderThanks(deps.render), { cacheControl: CACHE_PAGE })),
    ),
    route("POST", "/api/contact", contact),

    route("GET", "/static/:path*", async ({ request, url, params }) => {
      const result = await serveStatic(
        deps.config.staticDir,
        params.path ?? "",
        request,
        url.searchParams.has("v"),
      );
      if (result.refused === "escape" || result.refused === "invalid") {
        deps.logger.warn("static.refused", { reason: result.refused, path: url.pathname });
      }
      return result.response;
    }),

    route("GET", "/robots.txt", page(() => textResponse(robotsTxt(deps.config.origin)))),
    route("GET", "/humans.txt", page(() => textResponse(humansTxt()))),
    route(
      "GET",
      "/sitemap.xml",
      page(() =>
        textResponse(sitemapXml(deps.config.origin, deps.startedAt), {
          contentType: "application/xml; charset=utf-8",
        })
      ),
    ),
    route(
      "GET",
      "/manifest.webmanifest",
      page(() =>
        textResponse(manifestJson(), {
          contentType: "application/manifest+json; charset=utf-8",
        })
      ),
    ),

    // Unlinked, unindexed, and not in the sitemap. The door is still bolted:
    // every route below the login checks the session, and robots.txt disallows
    // the lot. See src/routes/admin.ts.
    ...adminRoutes({
      config: deps.config,
      logger: deps.logger,
      kv: deps.kv,
      contact: deps.contact,
      render: deps.render,
    }),

    // Liveness only: no version, no build hash, no dependency status. A health
    // endpoint that describes the system is a reconnaissance endpoint.
    route("GET", "/healthz", page(() => jsonResponse({ status: "ok" }))),
  ];
}

/** Strip the body from a HEAD response while keeping every header. */
function toHeadResponse(response: Response): Response {
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export type Fetch = (request: Request, client: string) => Promise<Response>;

export function createApp(deps: AppDeps): Fetch {
  const routes = buildRoutes(deps);

  async function dispatch(request: Request, client: string): Promise<Response> {
    const url = new URL(request.url);

    if (!SUPPORTED_METHODS.has(request.method)) {
      return new Response(null, { status: 405, headers: { allow: "GET, HEAD, POST, OPTIONS" } });
    }

    const match = matchRoutes(routes, request.method, url);

    if (match.kind === "no-match") {
      if (isAdminPath(url)) {
        return await rejected(deps, request, url, 404);
      }
      return htmlResponse(renderNotFound(deps.render), { status: 404, cacheControl: CACHE_NONE });
    }

    if (match.kind === "method-not-allowed") {
      const allow = match.allowed.join(", ");
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: { allow } });
      }
      if (isAdminPath(url)) {
        return await rejected(deps, request, url, 405);
      }
      return htmlResponse(renderError(deps.render, 405, statusMessage(405)), {
        status: 405,
        cacheControl: CACHE_NONE,
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { allow: "GET, HEAD, POST, OPTIONS" } });
    }

    const response = await match.route.handler({
      request,
      url,
      params: match.params,
      client,
    });
    return request.method === "HEAD" ? toHeadResponse(response) : response;
  }

  return async function handle(request: Request, client: string): Promise<Response> {
    const started = performance.now();
    let response: Response;

    try {
      response = await dispatch(request, client);
    } catch (error) {
      // Any escaped exception ends here. The code is the only thing shared
      // between what the journal records and what the visitor is shown, which
      // is what makes a reported failure findable later.
      const path = new URL(request.url).pathname;
      const code = newIncidentCode();
      deps.logger.error("request.failed", {
        incident: code,
        error,
        method: request.method,
        path,
      });
      try {
        response = htmlResponse(
          await renderFailure(deps, request, 500, code, detailOf(error, request, path)),
          { status: 500, cacheControl: CACHE_NONE },
        );
      } catch (secondary) {
        // The failure page renders through the same layout as every other page,
        // so whatever broke the request can break the page reporting it. This is
        // the floor: no layout, no context, no templates — just the code, so the
        // journal is still reachable from what the visitor saw.
        deps.logger.error("request.failed_twice", { incident: code, error: secondary });
        response = lastResort(code);
      }
    }

    const secured = withSecurityHeaders(response, deps.security);
    deps.logger.info("request", {
      method: request.method,
      path: new URL(request.url).pathname,
      status: secured.status,
      ms: Math.round(performance.now() - started),
      client,
    });
    return secured;
  };
}
