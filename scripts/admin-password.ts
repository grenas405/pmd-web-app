/**
 * admin-password.ts — set or change the admin password.
 *
 *   sudo DENO_DIR=/var/cache/pmd-web/deno deno task admin-password
 *
 * As root, and both halves of that are deliberate.
 *
 * Not as yourself: the unit runs with UMask=0027, so the KV file it created is
 * 0640 owned by the service account — readable, not writable.
 *
 * And not as the service account either, tempting as it looks. `sudo -u pmdweb`
 * does not change directory, and that account cannot traverse a 0750 home
 * directory to reach this checkout; it fails with "couldn't find deno.json",
 * which looks like a missing file and is really a missing permission. It is
 * meant to be unable to get in there — the running service only reaches the
 * code through systemd's bind mounts.
 *
 * DENO_DIR points at the cache scripts/deploy.sh already warmed, so this
 * fetches nothing over the network.
 *
 * Nothing secret is printed, and the password never reaches a shell argument
 * where it would land in history or in `ps`.
 */

import { loadConfig } from "../src/config.ts";
import { hasPassword, setPassword } from "../src/admin/auth.ts";

const MINIMUM = 12;

/** Read a line with the terminal's echo off, so nothing is left on screen. */
function askHidden(question: string): string {
  const stdin = Deno.stdin;
  console.error(question);
  if (stdin.isTerminal()) stdin.setRaw(true);
  try {
    const bytes: number[] = [];
    const buffer = new Uint8Array(1);
    while (true) {
      const read = stdin.readSync(buffer);
      if (read === null || read === 0) break;
      const byte = buffer[0] ?? 0;
      if (byte === 13 || byte === 10) break; // enter
      if (byte === 3) throw new Error("cancelled"); // ctrl-c
      if (byte === 127 || byte === 8) { // backspace
        bytes.pop();
        continue;
      }
      bytes.push(byte);
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  } finally {
    if (stdin.isTerminal()) stdin.setRaw(false);
    console.error("");
  }
}

if (import.meta.main) {
  const config = loadConfig();
  const kv = await Deno.openKv(config.kvPath);

  try {
    const existing = await hasPassword(kv);
    console.error(
      existing
        ? `Changing the admin password in ${config.kvPath}.`
        : `Setting the first admin password in ${config.kvPath}.`,
    );

    const password = askHidden("New password:");
    if (password.length < MINIMUM) {
      console.error(`Too short — ${MINIMUM} characters minimum. Nothing was changed.`);
      Deno.exit(1);
    }

    const again = askHidden("Again:");
    if (password !== again) {
      console.error("Those did not match. Nothing was changed.");
      Deno.exit(1);
    }

    await setPassword(kv, password);
    console.error("Done. The new password is in effect immediately — no restart needed.");
  } catch (error) {
    // A permission error here is almost always the wrong user, so say so.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Could not set the password: ${message}`);
    if (message.includes("permission") || message.includes("readonly")) {
      console.error(
        "The KV file belongs to the service account. Try:\n" +
          "  sudo DENO_DIR=/var/cache/pmd-web/deno deno task admin-password",
      );
    }
    Deno.exit(1);
  } finally {
    kv.close();
  }
}
