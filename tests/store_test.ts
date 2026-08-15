/**
 * store_test.ts — the enquiry record and where it goes.
 *
 * `Deno.openKv(":memory:")` gives each test its own database with no file to
 * create and nothing to clean up, so these run as fast as the pure tests do.
 */

import { assert, assertEquals } from "@std/assert";
import { inquiryKey, recentInquiries, saveInquiry, toRecord } from "../src/contact/store.ts";
import type { ContactMessage } from "../src/contact/message.ts";

const MESSAGE: ContactMessage = {
  name: "Dana Reed",
  email: "dana@reedauto.example",
  company: "Reed Auto",
  message: "Our three bays are booked on a paper calendar and it is costing us jobs.",
};

Deno.test("a record carries the submission, the source and the time", () => {
  const at = new Date("2026-08-15T17:04:05.000Z");
  const record = toRecord(MESSAGE, "203.0.113.9", at);

  assertEquals(record.name, "Dana Reed");
  assertEquals(record.company, "Reed Auto");
  assertEquals(record.source, "203.0.113.9");
  assertEquals(record.receivedAt, "2026-08-15T17:04:05.000Z");
});

Deno.test("a submission naming a plan is a pricing enquiry", () => {
  const plain = toRecord(MESSAGE, "c", new Date());
  assertEquals(plain.kind, "contact");
  assertEquals(plain.plan, null);

  const priced = toRecord({ ...MESSAGE, plan: "launch-295" }, "c", new Date());
  assertEquals(priced.kind, "pricing", "the pricing page is the only source of that field");
  assertEquals(priced.plan, "launch-295");
});

Deno.test("a missing company becomes an empty string, never undefined", () => {
  const { company, ...withoutCompany } = MESSAGE;
  assert(company !== undefined);
  assertEquals(toRecord(withoutCompany, "c", new Date()).company, "");
});

Deno.test("keys sort newest last, so a reversed list is newest first", () => {
  const older = toRecord(MESSAGE, "c", new Date("2026-08-01T00:00:00.000Z"));
  const newer = toRecord(MESSAGE, "c", new Date("2026-08-15T00:00:00.000Z"));

  const [a, b] = [inquiryKey(older, "id-a"), inquiryKey(newer, "id-b")];
  assertEquals(a[0], "inquiry");
  assert(String(a[1]) < String(b[1]), "time must sort before the random id");
});

Deno.test("an enquiry survives a round trip through KV", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const record = toRecord({ ...MESSAGE, plan: "launch-295" }, "203.0.113.9", new Date());
    await saveInquiry(kv, record);

    const found = await recentInquiries(kv);
    assertEquals(found.length, 1);
    assertEquals(found[0]?.email, "dana@reedauto.example");
    assertEquals(found[0]?.kind, "pricing");
  } finally {
    kv.close();
  }
});

Deno.test("two enquiries in the same millisecond both survive", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    // Same timestamp, different ids: the id is the last key segment precisely
    // so a burst cannot overwrite itself.
    const at = new Date("2026-08-15T12:00:00.000Z");
    await saveInquiry(kv, toRecord(MESSAGE, "a", at), "id-a");
    await saveInquiry(kv, toRecord(MESSAGE, "b", at), "id-b");

    assertEquals((await recentInquiries(kv)).length, 2);
  } finally {
    kv.close();
  }
});

Deno.test("the newest enquiry is listed first", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    await saveInquiry(kv, toRecord(MESSAGE, "old", new Date("2026-01-01T00:00:00.000Z")));
    await saveInquiry(kv, toRecord(MESSAGE, "new", new Date("2026-08-15T00:00:00.000Z")));

    const found = await recentInquiries(kv);
    assertEquals(found[0]?.source, "new", "reading the inbox must start with what just arrived");
  } finally {
    kv.close();
  }
});
