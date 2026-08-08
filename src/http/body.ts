/**
 * body.ts — read a request body without trusting the client about its size.
 *
 * `Content-Length` is a claim, not a fact, so the stream is counted as it is
 * consumed and abandoned the moment it exceeds the cap. A declared length that
 * is already too large is refused before a single byte is read.
 */

export type BodyResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly reason: "too-large" | "unreadable" };

export const MAX_FORM_BYTES = 16 * 1024;

export async function readLimitedText(request: Request, maxBytes: number): Promise<BodyResult> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, reason: "too-large" };
  }
  if (request.body === null) return { ok: true, text: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "unreadable" };
  } finally {
    reader.releaseLock();
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(joined) };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}

/** The media type without parameters, lower-cased. Pure. */
export function mediaType(request: Request): string {
  const header = request.headers.get("content-type") ?? "";
  return (header.split(";")[0] ?? "").trim().toLowerCase();
}

/**
 * Turn a submitted body into a flat string map.
 *
 * Only the two shapes this site actually sends are accepted: a normal form
 * POST and a `fetch` with JSON. Anything else is refused rather than guessed
 * at. Repeated keys keep the first value; nested JSON values are rejected.
 */
export function parseSubmission(
  type: string,
  text: string,
): Record<string, string> | null {
  if (type === "application/x-www-form-urlencoded") {
    const params = new URLSearchParams(text);
    const fields: Record<string, string> = {};
    for (const [key, value] of params) {
      if (!(key in fields)) fields[key] = value;
    }
    return fields;
  }

  if (type === "application/json") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== "string") return null;
      fields[key] = value;
    }
    return fields;
  }

  return null;
}
