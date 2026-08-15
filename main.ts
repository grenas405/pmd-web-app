#!/usr/bin/env -S deno run --allow-net=0.0.0.0 --allow-read=static,var --allow-write=var --allow-env
/**
 * main.ts — startup, in the order things must happen.
 *
 * Read configuration, index the static assets, compute the Content-Security-
 * Policy hash for the one inline script, build the application, listen. Every
 * dependency an inner module needs is created here and passed down; nothing
 * reaches back out for a global.
 */

import { loadConfig } from "./src/config.ts";
import { createLogger } from "./src/log.ts";
import { indexAssets } from "./src/http/assets.ts";
import type { SecurityOptions } from "./src/http/security.ts";
import { createApp } from "./src/app.ts";
import { inlineScriptHashes } from "./src/render/layout.ts";
import { structuredData } from "./src/content/site.ts";
import type { RenderContext } from "./src/render/context.ts";

export async function start(): Promise<Deno.HttpServer> {
  const config = loadConfig();
  const logger = createLogger(config.env === "development" ? "debug" : "info");
  const startedAt = new Date();

  const assets = await indexAssets(config.staticDir);

  // One handle for the process, opened here and passed down: no module reaches
  // for a global, and the same rule that governs config and the logger governs
  // storage. The file lives in `var/`, the one writable directory the service
  // has.
  const kv = await Deno.openKv(config.kvPath);

  const jsonLd = structuredData(config.origin);
  // The hashes come from the module that emits the scripts, so the policy and
  // the page cannot drift. Still no 'unsafe-inline' and no nonce.
  const security: SecurityOptions = {
    hsts: config.hsts,
    scriptHashes: await inlineScriptHashes(jsonLd),
  };

  const render: RenderContext = {
    origin: config.origin,
    asset: assets.url,
    jsonLd,
  };

  const app = createApp({ config, logger, render, security, startedAt, kv });

  const server = Deno.serve({
    port: config.port,
    hostname: config.hostname,
    onListen: ({ hostname, port }) => {
      logger.info("server.listening", {
        hostname,
        port,
        origin: config.origin,
        env: config.env,
        assets: assets.hashes.size,
      });
    },
    onError: (error) => {
      // Reached only if the handler itself throws before its own guard.
      logger.error("server.unhandled", { error });
      return new Response("Service unavailable", { status: 503 });
    },
  }, (request, info) => app(request, info.remoteAddr.hostname));

  // systemd sends SIGTERM on `stop` and `restart`; finish in-flight requests
  // rather than dropping them.
  const shutdown = () => {
    logger.info("server.shutdown");
    void server.shutdown().finally(() => kv.close());
  };
  Deno.addSignalListener("SIGTERM", shutdown);
  Deno.addSignalListener("SIGINT", shutdown);

  return server;
}

if (import.meta.main) {
  await start();
}
