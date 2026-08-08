/**
 * contact.ts — the only endpoint that changes state, and therefore the only
 * one with a real threat model.
 *
 * Order matters, and it is the order below: method and content type first,
 * then origin (CSRF), then size, then rate limit, then schema. Each gate is
 * cheap relative to the next, so an abusive request is rejected before it can
 * make the server do work.
 *
 * The same handler answers a browser form POST with HTML and a `fetch` with
 * JSON, which is why the page works with JavaScript disabled.
 */

import type { Config } from "../config.ts";
import { allowedOrigins } from "../config.ts";
import type { Logger } from "../log.ts";
import type { Handler, RouteContext } from "../http/router.ts";
import { MAX_FORM_BYTES, mediaType, parseSubmission, readLimitedText } from "../http/body.ts";
import { isAllowedOrigin } from "../http/security.ts";
import type { RateLimiter } from "../http/ratelimit.ts";
import { clientKey } from "../http/ratelimit.ts";
import {
  CACHE_NONE,
  htmlResponse,
  jsonResponse,
  prefersJson,
  redirect,
  statusMessage,
} from "../http/respond.ts";
import { appendToInbox, toRecord } from "../contact/inbox.ts";
import { echoValues, parseContact } from "../contact/message.ts";
import { renderHome } from "../pages/home.ts";
import type { RenderContext } from "../render/context.ts";
import { type ContactFormState, SENT_MESSAGE } from "./contact_state.ts";

export interface ContactDeps {
  readonly config: Config;
  readonly logger: Logger;
  readonly limiter: RateLimiter;
  readonly render: RenderContext;
}

/** Render the answer in whichever form the client asked for. */
function answer(
  deps: ContactDeps,
  context: RouteContext,
  status: number,
  state: ContactFormState,
): Response {
  if (prefersJson(context.request)) {
    const body = state.status === "sent"
      ? { ok: true, message: state.message }
      : { ok: false, message: state.message, errors: state.errors ?? {} };
    return jsonResponse(body, { status });
  }
  // Post/Redirect/Get for the no-JavaScript path: a refresh after success must
  // not resubmit the form.
  if (state.status === "sent") return redirect("/thank-you", 303);
  return htmlResponse(renderHome(deps.render, state), { status, cacheControl: CACHE_NONE });
}

export function createContactHandler(deps: ContactDeps): Handler {
  const origins = allowedOrigins(deps.config);

  return async (context: RouteContext): Promise<Response> => {
    const { request, client } = context;

    const type = mediaType(request);
    if (type !== "application/x-www-form-urlencoded" && type !== "application/json") {
      return answer(deps, context, 415, {
        status: "error",
        message: statusMessage(415),
      });
    }

    if (!isAllowedOrigin(request, origins)) {
      deps.logger.warn("contact.origin_rejected", {
        origin: request.headers.get("origin") ?? "(none)",
        client,
      });
      return answer(deps, context, 403, { status: "error", message: statusMessage(403) });
    }

    const body = await readLimitedText(request, MAX_FORM_BYTES);
    if (!body.ok) {
      const status = body.reason === "too-large" ? 413 : 400;
      return answer(deps, context, status, { status: "error", message: statusMessage(status) });
    }

    const key = clientKey(request, client, deps.config.trustProxy);
    const decision = deps.limiter.check(key);
    if (!decision.allowed) {
      deps.logger.warn("contact.rate_limited", { client: key });
      const response = answer(deps, context, 429, {
        status: "limited",
        message: statusMessage(429),
      });
      response.headers.set("retry-after", String(decision.retryAfterSeconds));
      return response;
    }

    const fields = parseSubmission(type, body.text);
    if (fields === null) {
      return answer(deps, context, 400, { status: "error", message: statusMessage(400) });
    }

    const parsed = parseContact(fields);
    if (!parsed.ok) {
      return answer(deps, context, 400, {
        status: "invalid",
        message: "Some details need another look before I can send this.",
        errors: parsed.errors,
        values: echoValues(fields),
      });
    }

    // A filled honeypot is answered exactly like a success: a bot learns
    // nothing, and a person who somehow tripped it is not shown an error.
    if (parsed.spam) {
      deps.logger.info("contact.honeypot", { client: key });
      return answer(deps, context, 200, { status: "sent", message: SENT_MESSAGE });
    }

    try {
      await appendToInbox(
        deps.config.inboxPath,
        toRecord(parsed.message, key, new Date()),
      );
    } catch (error) {
      // The failure detail goes to the log; the visitor gets a sentence and a
      // way to reach me that does not depend on this endpoint working.
      deps.logger.error("contact.write_failed", { error });
      return answer(deps, context, 500, {
        status: "error",
        message: "I could not store that message. Please email me directly and I will reply.",
        values: echoValues(fields),
      });
    }

    deps.logger.info("contact.received", { company: parsed.message.company ?? "" });
    return answer(deps, context, 200, { status: "sent", message: SENT_MESSAGE });
  };
}
