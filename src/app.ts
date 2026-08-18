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
import type { RenderContext } from "./render/context.ts";
import { renderHome } from "./pages/home.ts";
import { renderError, renderNotFound, renderThanks } from "./pages/simple.ts";
import { IDLE_FORM } from "./routes/contact_state.ts";
import { renderPricing } from "./pages/pricing.ts";
import { renderThesis } from "./pages/thesis.ts";
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
      return htmlResponse(renderNotFound(deps.render), { status: 404, cacheControl: CACHE_NONE });
    }

    if (match.kind === "method-not-allowed") {
      const allow = match.allowed.join(", ");
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: { allow } });
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
      // Any escaped exception ends here. The detail is logged; the client sees
      // a generic page with no internal information in it.
      deps.logger.error("request.failed", { error, path: new URL(request.url).pathname });
      response = htmlResponse(renderError(deps.render, 500, statusMessage(500)), {
        status: 500,
        cacheControl: CACHE_NONE,
      });
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
