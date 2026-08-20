/**
 * kv_probe.ts — one write at boot, so a read-only database announces itself.
 *
 * Deno KV is a SQLite file whose permissions belong to the deployment, not to
 * the application. If the service account can read it but not write it — one
 * recursive chmod is enough to arrange that — then the site still starts, every
 * page still renders, and only writes fail. The process looks perfectly healthy.
 * That is what makes the fault expensive: the first symptom is a 500 from a
 * visitor's contact form, days later, on a server that reports itself as fine.
 *
 * So the write happens once, deliberately, at the moment there is still somebody
 * watching the deploy.
 *
 * It reports rather than throws. A site that cannot record enquiries is still a
 * site worth serving, and exiting here would hand systemd a restart loop —
 * turning a broken form into an outage, which is strictly worse.
 */

import type { Logger } from "./log.ts";

/** Short-lived so a crash between the set and the delete cleans up after itself. */
const PROBE_KEY = ["startup-probe"] as const;
const PROBE_TTL_MS = 60_000;

/** True when the database accepted a write. Never throws. */
export async function probeWritable(
  kv: Deno.Kv,
  logger: Logger,
  kvPath: string,
): Promise<boolean> {
  try {
    await kv.set(PROBE_KEY, Date.now(), { expireIn: PROBE_TTL_MS });
    await kv.delete(PROBE_KEY);
    return true;
  } catch (error) {
    // The remedy travels with the error, because the person reading this line
    // is the person who has to fix it and there is nobody else to ask.
    logger.error("kv.readonly", {
      error,
      path: kvPath,
      impact: "enquiries and admin sign-in will fail; pages still serve",
      remedy: "chown -R <service-user>:<owner-group> var && chmod -R g+rwX var",
    });
    return false;
  }
}
