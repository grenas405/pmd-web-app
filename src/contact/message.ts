/**
 * message.ts — what a valid contact submission is. No I/O, no HTTP.
 *
 * The schema is the boundary: everything downstream of `parseContact` may
 * assume well-formed, length-bounded, control-character-free strings. Error
 * messages are written for the person filling in the form, not for a developer
 * reading a stack trace.
 */

import { z } from "zod";

/**
 * Normalise submitted text: one newline convention, no control characters, no
 * runs of horizontal whitespace, at most one blank line. Paragraph breaks are
 * kept because a description of a business problem legitimately has them. Pure.
 */
function tidy(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    // deno-lint-ignore no-control-regex
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const text = (max: number) => z.string().max(max * 2).transform(tidy);

export const ContactSchema = z.object({
  name: text(120).pipe(
    z.string()
      .min(2, "Please tell me your name.")
      .max(120, "That name is longer than this form accepts."),
  ),
  email: text(254).pipe(
    z.email("That does not look like an email address.").max(254, "That email is too long."),
  ),
  company: text(120).pipe(z.string().max(120, "That business name is too long.")).optional(),
  message: text(4000).pipe(
    z.string()
      .min(20, "A sentence or two about the problem helps — 20 characters minimum.")
      .max(4000, "Please keep it under 4000 characters; we can go deeper by email."),
  ),
  /**
   * The plan the visitor was reading about, carried from the pricing page as a
   * hidden field. A literal rather than free text: this value is written
   * straight into storage and shown back to the operator.
   *
   * `.catch` rather than a plain optional, because the visitor cannot see or
   * correct this field — a tampered or stale value should be quietly dropped,
   * never turned into a validation error they are asked to fix.
   */
  plan: z.literal("launch-295").optional().catch(undefined),
  /** Bot trap: a field hidden from people and irresistible to form fillers. */
  website: z.string().max(200).optional(),
});

export type ContactMessage = z.infer<typeof ContactSchema>;

export type ContactParse =
  | { readonly ok: true; readonly message: ContactMessage; readonly spam: boolean }
  | { readonly ok: false; readonly errors: Record<string, string> };

/** Validate a flat field map. Pure. */
export function parseContact(fields: Record<string, unknown>): ContactParse {
  const result = ContactSchema.safeParse(fields);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field !== "string" || field in errors) continue;
      errors[field] = issue.message;
    }
    return { ok: false, errors };
  }
  const filled = (result.data.website ?? "").length > 0;
  return { ok: true, message: result.data, spam: filled };
}

/** The values to echo back into the form after a failed submission. Pure. */
export function echoValues(fields: Record<string, unknown>): Record<string, string> {
  const keep = ["name", "email", "company", "message"] as const;
  const values: Record<string, string> = {};
  for (const key of keep) {
    const value = fields[key];
    if (typeof value === "string") values[key] = tidy(value).slice(0, 4000);
  }
  return values;
}
