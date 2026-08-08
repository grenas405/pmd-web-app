/**
 * log.ts — one line of JSON per event on stdout, nothing else.
 *
 * systemd/journald captures stdout, so the server needs no log rotation, no
 * file handles and no write permission. Values are scrubbed before they are
 * printed: logs are an output boundary, and untrusted text must not be able to
 * forge a log line or smuggle control characters into a terminal.
 */

export type Level = "debug" | "info" | "warn" | "error";

export type Fields = Readonly<Record<string, unknown>>;

export interface Logger {
  readonly debug: (message: string, fields?: Fields) => void;
  readonly info: (message: string, fields?: Fields) => void;
  readonly warn: (message: string, fields?: Fields) => void;
  readonly error: (message: string, fields?: Fields) => void;
}

const MAX_VALUE_LENGTH = 512;

/** Keys whose values are never printed, matched case-insensitively. */
const SECRET_KEY = /(pass|secret|token|key|auth|cookie|session)/i;

/**
 * Make one value safe to serialise: strip control characters, cap the length,
 * and reduce anything exotic to a plain description. Pure.
 */
export function sanitizeValue(value: unknown): unknown {
  if (value === null) return null;
  switch (typeof value) {
    case "string": {
      // deno-lint-ignore no-control-regex
      const flattened = value.replace(/[\u0000-\u001f\u007f]/g, " ");
      return flattened.length > MAX_VALUE_LENGTH
        ? `${flattened.slice(0, MAX_VALUE_LENGTH)}…`
        : flattened;
    }
    case "number":
      return Number.isFinite(value) ? value : String(value);
    case "boolean":
      return value;
    case "undefined":
      return undefined;
    default:
      if (value instanceof Error) return sanitizeValue(value.message);
      if (Array.isArray(value)) return value.slice(0, 20).map(sanitizeValue);
      return sanitizeValue(String(value));
  }
}

/** Redact secret-looking keys and sanitise the rest. Pure. */
export function sanitizeFields(fields: Fields): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    safe[key] = SECRET_KEY.test(key) ? "[redacted]" : sanitizeValue(value);
  }
  return safe;
}

/** Build the JSON line for an event. Pure, so it can be asserted on in tests. */
export function formatEvent(
  level: Level,
  message: string,
  fields: Fields,
  time: Date,
): string {
  return JSON.stringify({
    time: time.toISOString(),
    level,
    msg: sanitizeValue(message),
    ...sanitizeFields(fields),
  });
}

const RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** Create a logger that writes to stdout at or above `minimum`. */
export function createLogger(minimum: Level = "info"): Logger {
  const write = (level: Level) => (message: string, fields: Fields = {}) => {
    if (RANK[level] < RANK[minimum]) return;
    console.log(formatEvent(level, message, fields, new Date()));
  };
  return Object.freeze({
    debug: write("debug"),
    info: write("info"),
    warn: write("warn"),
    error: write("error"),
  });
}

/** A logger that discards everything. Useful in tests. */
export const silentLogger: Logger = Object.freeze({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});
