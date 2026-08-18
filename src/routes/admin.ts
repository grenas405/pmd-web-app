/**
 * admin.ts — the door and the rooms behind it.
 *
 * Nothing on the public site links here. That is not the security control —
 * obscurity never is — it is only there to keep the door out of the way. The
 * controls are the ones in every handler below: a session on each request, an
 * Origin check on each write, a lockout that survives a restart, and responses
 * that are never cached and never indexed.
 */

import type { Config } from "../config.ts";
import { allowedOrigins } from "../config.ts";
import type { Logger } from "../log.ts";
import type { Handler, Route, RouteContext } from "../http/router.ts";
import { route } from "../http/router.ts";
import { MAX_FORM_BYTES, mediaType, parseSubmission, readLimitedText } from "../http/body.ts";
import { isAllowedOrigin } from "../http/security.ts";
import { clientKey } from "../http/ratelimit.ts";
import { CACHE_NONE, htmlResponse, redirect, statusMessage } from "../http/respond.ts";
import type { RenderContext } from "../render/context.ts";
import {
  clearedCookie,
  clearFailures,
  createSession,
  currentSession,
  destroySession,
  lockoutState,
  recordFailure,
  sessionCookie,
  tokenFrom,
  verifyPassword,
} from "../admin/auth.ts";
import { ContactSchema, type ContactStore } from "../admin/contact.ts";
import { deleteInquiry, markInquiry, recentWithIds } from "../contact/store.ts";
import { renderLogin } from "../pages/admin_login.ts";
import { renderDashboard } from "../pages/admin_dashboard.ts";

export interface AdminDeps {
  readonly config: Config;
  readonly logger: Logger;
  readonly kv: Deno.Kv;
  readonly contact: ContactStore;
  readonly render: RenderContext;
}

/** Never cached, never indexed. Applied to every response from this module. */
function seal(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", CACHE_NONE);
  headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  return new Response(response.body, { status: response.status, headers });
}

export function adminRoutes(deps: AdminDeps): readonly Route[] {
  const origins = allowedOrigins(deps.config);

  /** Wrap a handler so it only runs for a signed-in session. */
  function guarded(handler: Handler): Handler {
    return async (context: RouteContext): Promise<Response> => {
      const session = await currentSession(deps.kv, context.request);
      if (session === null) return seal(redirect("/admin", 303));
      return seal(await handler(context));
    };
  }

  /** Read a form body, refusing anything that is not a same-origin POST. */
  async function readForm(
    context: RouteContext,
  ): Promise<Record<string, unknown> | Response> {
    if (!isAllowedOrigin(context.request, origins)) {
      deps.logger.warn("admin.origin_rejected", {
        origin: context.request.headers.get("origin") ?? "(none)",
        client: context.client,
      });
      return seal(new Response(statusMessage(403), { status: 403 }));
    }
    if (mediaType(context.request) !== "application/x-www-form-urlencoded") {
      return seal(new Response(statusMessage(415), { status: 415 }));
    }
    const body = await readLimitedText(context.request, MAX_FORM_BYTES);
    if (!body.ok) return seal(new Response(statusMessage(400), { status: 400 }));

    const fields = parseSubmission("application/x-www-form-urlencoded", body.text);
    return fields ?? seal(new Response(statusMessage(400), { status: 400 }));
  }

  return [
    route("GET", "/admin", async (context) => {
      const session = await currentSession(deps.kv, context.request);
      if (session !== null) return seal(redirect("/admin/dashboard", 303));
      return seal(htmlResponse(renderLogin(deps.render, {}), { cacheControl: CACHE_NONE }));
    }),

    route("POST", "/admin", async (context) => {
      const fields = await readForm(context);
      if (fields instanceof Response) return fields;

      const client = clientKey(context.request, context.client, deps.config.trustProxy);
      const lock = await lockoutState(deps.kv, client);
      if (lock.locked) {
        deps.logger.warn("admin.locked_out", { client });
        return seal(htmlResponse(
          renderLogin(deps.render, { error: "Too many attempts. Try again in a few minutes." }),
          { status: 429, cacheControl: CACHE_NONE },
        ));
      }

      const password = typeof fields.password === "string" ? fields.password : "";
      if (!await verifyPassword(deps.kv, password)) {
        await recordFailure(deps.kv, client);
        deps.logger.warn("admin.sign_in_failed", { client });
        // Says nothing about which half was wrong, or whether an account exists.
        return seal(htmlResponse(
          renderLogin(deps.render, { error: "That did not work." }),
          { status: 401, cacheControl: CACHE_NONE },
        ));
      }

      await clearFailures(deps.kv, client);
      const token = await createSession(deps.kv);
      deps.logger.info("admin.signed_in", { client });

      const response = seal(redirect("/admin/dashboard", 303));
      response.headers.append("set-cookie", sessionCookie(token, deps.config.origin));
      return response;
    }),

    route("POST", "/admin/signout", async (context) => {
      const token = tokenFrom(context.request);
      if (token !== null) await destroySession(deps.kv, token);
      const response = seal(redirect("/admin", 303));
      response.headers.append("set-cookie", clearedCookie(deps.config.origin));
      return response;
    }),

    route(
      "GET",
      "/admin/dashboard",
      guarded(async () =>
        htmlResponse(
          renderDashboard(deps.render, {
            inquiries: await recentWithIds(deps.kv, 200),
            contact: deps.contact.current(),
            overridden: deps.contact.overridden(),
          }),
          { cacheControl: CACHE_NONE },
        )
      ),
    ),

    route(
      "POST",
      "/admin/enquiry",
      guarded(async (context) => {
        const fields = await readForm(context);
        if (fields instanceof Response) return fields;

        const id = typeof fields.id === "string" ? fields.id : "";
        const action = typeof fields.action === "string" ? fields.action : "";

        if (action === "delete") {
          // First press only asks. The policy forbids inline handlers, so a
          // browser confirm() would never fire — this asks on the server, and
          // works with JavaScript switched off.
          return htmlResponse(
            renderDashboard(deps.render, {
              inquiries: await recentWithIds(deps.kv, 200),
              contact: deps.contact.current(),
              overridden: deps.contact.overridden(),
              confirmDelete: id,
            }),
            { cacheControl: CACHE_NONE },
          );
        }

        if (action === "delete-confirm") {
          // Leaves a tombstone: a lost lead should leave a trace of having
          // existed, and a stolen session should not be able to erase quietly.
          await deleteInquiry(deps.kv, id);
          deps.logger.warn("admin.enquiry_deleted", { id });
        } else if (action === "handled" || action === "archived" || action === "open") {
          await markInquiry(deps.kv, id, action);
        }
        return redirect("/admin/dashboard", 303);
      }),
    ),

    route(
      "POST",
      "/admin/contact",
      guarded(async (context) => {
        const fields = await readForm(context);
        if (fields instanceof Response) return fields;

        if (fields.action === "reset") {
          await deps.contact.reset();
          deps.logger.info("admin.contact_reset", {});
          return redirect("/admin/dashboard#contact", 303);
        }

        const parsed = ContactSchema.safeParse(fields);
        if (!parsed.success) {
          const message = parsed.error.issues[0]?.message ?? "Those details did not validate.";
          return htmlResponse(
            renderDashboard(deps.render, {
              inquiries: await recentWithIds(deps.kv, 200),
              contact: deps.contact.current(),
              overridden: deps.contact.overridden(),
              contactError: message,
            }),
            { status: 400, cacheControl: CACHE_NONE },
          );
        }

        // Rewrites the JSON-LD and its CSP hash before returning, so no request
        // is ever served a graph the policy does not admit.
        await deps.contact.save(parsed.data);
        deps.logger.info("admin.contact_saved", {});
        return redirect("/admin/dashboard#contact", 303);
      }),
    ),
  ];
}
