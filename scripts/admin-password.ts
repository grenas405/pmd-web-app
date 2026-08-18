/**
 * admin-password.ts — set or change the admin password.
 *
 *   sudo -u pmdweb deno task admin-password
 *
 * As the service user, deliberately. The unit runs with UMask=0027, so the KV
 * file it created is 0640 and owned by that account: the checkout's owner can
 * read the database and cannot write it. Running this as yourself fails on a
 * permission error that looks like a bug and is not.
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
      console.error("Try again as the service user:  sudo -u pmdweb deno task admin-password");
    }
    Deno.exit(1);
  } finally {
    kv.close();
  }
}
