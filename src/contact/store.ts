/**
 * store.ts — where an enquiry goes. The only module that persists anything.
 *
 * This was an append-only JSON Lines file, and a file was genuinely the right
 * size of tool for one form. What changed is that there are now two ways in —
 * the contact section and the pricing page — and a lead is worth being able to
 * read back in order, filter by kind, and count. Deno KV gives that without a
 * database process, credentials, or a migration to run: it is a file too, and
 * it lives in the same `var/` directory the file did.
 *
 * `toRecord` stays pure and separate from the write, so the shape of a stored
 * enquiry can be asserted in tests without opening anything.
 */

import type { ContactMessage } from "./message.ts";

/** Which door the enquiry came through. */
export type InquiryKind = "contact" | "pricing";

export interface InquiryRecord {
  readonly kind: InquiryKind;
  readonly receivedAt: string;
  readonly name: string;
  readonly email: string;
  readonly company: string;
  readonly message: string;
  /** The plan the visitor was looking at, when they came from the pricing page. */
  readonly plan: string | null;
  /** Coarse client identifier, kept for abuse investigation only. */
  readonly source: string;
}

/** Build the stored record. Pure, so the format can be asserted in tests. */
export function toRecord(
  message: ContactMessage,
  source: string,
  receivedAt: Date,
): InquiryRecord {
  const plan = message.plan ?? null;
  return {
    // An enquiry that names a plan came from the pricing page, by definition:
    // that field is only ever rendered there.
    kind: plan === null ? "contact" : "pricing",
    receivedAt: receivedAt.toISOString(),
    name: message.name,
    email: message.email,
    company: message.company ?? "",
    message: message.message,
    plan,
    source,
  };
}

/**
 * The key an enquiry is stored under. Pure.
 *
 * Time first so `list` in reverse returns newest first, and a random id last so
 * two submissions in the same millisecond cannot overwrite one another.
 */
export function inquiryKey(record: InquiryRecord, id: string): Deno.KvKey {
  return ["inquiry", record.receivedAt, id];
}

/** Persist one enquiry. A single `set` is atomic; nothing here needs a transaction. */
export async function saveInquiry(
  kv: Deno.Kv,
  record: InquiryRecord,
  id: string = crypto.randomUUID(),
): Promise<void> {
  await kv.set(inquiryKey(record, id), record);
}

/** Most recent enquiries first. Used by `deno task inbox`. */
export async function recentInquiries(kv: Deno.Kv, limit = 50): Promise<InquiryRecord[]> {
  const found: InquiryRecord[] = [];
  const entries = kv.list<InquiryRecord>({ prefix: ["inquiry"] }, { reverse: true, limit });
  for await (const entry of entries) found.push(entry.value);
  return found;
}
