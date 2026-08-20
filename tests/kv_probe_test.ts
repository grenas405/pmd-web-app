import { assert, assertEquals } from "@std/assert";
import { probeWritable } from "../src/kv_probe.ts";
import type { Fields, Logger } from "../src/log.ts";

/** Captures what was logged, so the remedy can be asserted on. */
function recorder(): { logger: Logger; events: { message: string; fields: Fields }[] } {
  const events: { message: string; fields: Fields }[] = [];
  const record = (message: string, fields: Fields = {}) => void events.push({ message, fields });
  return {
    events,
    logger: { debug: record, info: record, warn: record, error: record },
  };
}

/** Only the two methods the probe touches; a real Deno.Kv is not needed. */
function stubKv(set: () => Promise<unknown>): Deno.Kv {
  return { set, delete: () => Promise.resolve() } as unknown as Deno.Kv;
}

Deno.test("a writable database probes clean and says nothing", async () => {
  const { logger, events } = recorder();
  assertEquals(
    await probeWritable(stubKv(() => Promise.resolve()), logger, "var/kv.sqlite3"),
    true,
  );
  assertEquals(events.length, 0, "a healthy boot should be quiet");
});

Deno.test("a read-only database is reported, not thrown", async () => {
  const { logger, events } = recorder();
  const readonly = stubKv(() => Promise.reject(new Error("attempt to write a readonly database")));

  // The assertion that matters: this resolves. Throwing here would hand systemd
  // a restart loop and turn a broken form into an outage.
  assertEquals(await probeWritable(readonly, logger, "var/kv.sqlite3"), false);

  assertEquals(events.length, 1);
  assertEquals(events[0]?.message, "kv.readonly");
  assertEquals(events[0]?.fields.path, "var/kv.sqlite3");
  assert(
    String(events[0]?.fields.remedy).includes("chown"),
    "the log line has to carry the fix; there is nobody else to ask",
  );
});
