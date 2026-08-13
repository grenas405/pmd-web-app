/**
 * config.ts — read the environment once, validate it, hand back a frozen record.
 *
 * Every other module receives configuration as an explicit parameter. Nothing
 * else in this codebase touches `Deno.env`, so the set of knobs the server has
 * is exactly the shape below and nothing more.
 */

import { z } from "zod";

const port = z.coerce.number().int().min(1).max(65535);

/** Comma-separated origin list: "https://a.dev,https://b.dev" -> string[]. */
const originList = z
  .string()
  .optional()
  .transform((raw) => (raw ?? "").split(",").map((s) => s.trim()).filter((s) => s.length > 0))
  .pipe(z.array(z.url({ protocol: /^https?$/ })));

const ConfigSchema = z.object({
  /** TCP port to bind. */
  port: port.default(8002),
  /** Interface to bind. Bind loopback when Nginx terminates TLS in front. */
  hostname: z.string().min(1).default("127.0.0.1"),
  /** Canonical public origin, used for absolute URLs and Origin checks. */
  origin: z.url({ protocol: /^https?$/ }).default("http://localhost:8002"),
  /** Extra origins accepted on state-changing requests (staging hosts, etc). */
  trustedOrigins: originList,
  /** Directory served verbatim at /static/*. */
  staticDir: z.string().min(1).default("static"),
  /** Where contact submissions are appended as JSON Lines. */
  inboxPath: z.string().min(1).default("var/inbox.jsonl"),
  /** "development" relaxes caching and prints readable logs. */
  env: z.enum(["development", "production"]).default("development"),
  /** Emit Strict-Transport-Security. Only meaningful behind HTTPS. */
  hsts: z.stringbool().default(false),
  /** Trust X-Forwarded-For for client identity. Only true behind a proxy. */
  trustProxy: z.stringbool().default(false),
  /** Contact submissions allowed per client per window. */
  contactRateLimit: z.coerce.number().int().min(1).max(1000).default(5),
  /** Rate limit window in seconds. */
  contactRateWindowSeconds: z.coerce.number().int().min(1).max(86_400).default(600),
});

export type Config = Readonly<z.infer<typeof ConfigSchema>>;

/** Raw string map -> validated config. Pure: no `Deno.env` access here. */
export function parseConfig(env: Record<string, string | undefined>): Config {
  const parsed = ConfigSchema.parse({
    port: env.PORT,
    hostname: env.HOST,
    origin: env.PUBLIC_ORIGIN,
    trustedOrigins: env.TRUSTED_ORIGINS,
    staticDir: env.STATIC_DIR,
    inboxPath: env.INBOX_PATH,
    env: env.APP_ENV,
    hsts: env.ENABLE_HSTS,
    trustProxy: env.TRUST_PROXY,
    contactRateLimit: env.CONTACT_RATE_LIMIT,
    contactRateWindowSeconds: env.CONTACT_RATE_WINDOW_SECONDS,
  });
  return Object.freeze(parsed);
}

/** The one place that reads process environment. Called from `main.ts`. */
export function loadConfig(): Config {
  const keys = [
    "PORT",
    "HOST",
    "PUBLIC_ORIGIN",
    "TRUSTED_ORIGINS",
    "STATIC_DIR",
    "INBOX_PATH",
    "APP_ENV",
    "ENABLE_HSTS",
    "TRUST_PROXY",
    "CONTACT_RATE_LIMIT",
    "CONTACT_RATE_WINDOW_SECONDS",
  ] as const;

  const env: Record<string, string | undefined> = {};
  for (const key of keys) env[key] = Deno.env.get(key);
  return parseConfig(env);
}

/** Origins accepted on POST requests: the canonical one plus any extras. */
export function allowedOrigins(config: Config): ReadonlySet<string> {
  return new Set([config.origin, ...config.trustedOrigins]);
}
