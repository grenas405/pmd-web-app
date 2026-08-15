/**
 * inbox.ts — read the enquiries.
 *
 * Enquiries used to be a JSON Lines file, and reading them was `tail -f`. They
 * are in Deno KV now, so this exists to keep the operator's side of that trade
 * whole: one command, newest first, one JSON object per line so `jq` still
 * works exactly as it did.
 *
 *   deno task inbox            # the 50 most recent
 *   deno task inbox 200        # more of them
 *   deno task inbox | jq -r '[.receivedAt, .kind, .name, .email] | @tsv'
 *
 * Read-only: it opens the same database the service writes to and never
 * modifies it. Safe to run while the service is up.
 */

import { loadConfig } from "../src/config.ts";
import { recentInquiries } from "../src/contact/store.ts";

if (import.meta.main) {
  const limit = Number(Deno.args[0] ?? "50");
  if (!Number.isInteger(limit) || limit < 1) {
    console.error("usage: deno task inbox [limit]");
    Deno.exit(2);
  }

  const config = loadConfig();
  const kv = await Deno.openKv(config.kvPath);
  try {
    const found = await recentInquiries(kv, limit);
    for (const record of found) console.log(JSON.stringify(record));
    if (found.length === 0) console.error(`No enquiries yet in ${config.kvPath}.`);
  } finally {
    kv.close();
  }
}
