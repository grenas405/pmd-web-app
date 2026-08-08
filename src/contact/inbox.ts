/**
 * inbox.ts — append a submission to a JSON Lines file. This is the only module
 * in the application that writes to disk.
 *
 * A file is the right size of tool here: no database process, no schema
 * migration, no credentials to leak. `Deno.writeFile` with `append` is a single
 * O_APPEND write, which the kernel keeps atomic for small records, so
 * concurrent submissions cannot interleave.
 */

import { dirname } from "@std/path";
import type { ContactMessage } from "./message.ts";

export interface InboxRecord {
  readonly receivedAt: string;
  readonly name: string;
  readonly email: string;
  readonly company: string;
  readonly message: string;
  /** Coarse client identifier, kept for abuse investigation only. */
  readonly source: string;
}

/** Build the stored record. Pure, so the format can be asserted in tests. */
export function toRecord(
  message: ContactMessage,
  source: string,
  receivedAt: Date,
): InboxRecord {
  return {
    receivedAt: receivedAt.toISOString(),
    name: message.name,
    email: message.email,
    company: message.company ?? "",
    message: message.message,
    source,
  };
}

/** Append one record. Creates the directory and file on first use. */
export async function appendToInbox(path: string, record: InboxRecord): Promise<void> {
  await Deno.mkdir(dirname(path), { recursive: true });
  const line = new TextEncoder().encode(JSON.stringify(record) + "\n");
  await Deno.writeFile(path, line, { append: true, create: true, mode: 0o600 });
}
