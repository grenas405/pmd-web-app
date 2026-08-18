/**
 * contact.ts — the one thing the admin area may change, and the trap that
 * comes with it.
 *
 * The contact details are not only rendered in the footer and the contact
 * section. They also sit inside the JSON-LD graph, and that graph's SHA-256 is
 * what the Content-Security-Policy admits. Change the phone number and the
 * emitted JSON-LD no longer matches the hash in the header, so the browser
 * blocks it: the structured data quietly disappears from search results and the
 * only symptom is a console message nobody is looking at.
 *
 * So this store owns three things that have to move together — the details, the
 * serialised graph, and its hash — and recomputes all three on every write.
 *
 * KV is an override layer, never a replacement. A field comes from the database
 * only when it has been explicitly set; an empty database renders exactly the
 * committed site.
 */

import { z } from "zod";
import { type ContactDetails, defaultContact, structuredData } from "../content/site.ts";
import { inlineScriptHashes } from "../render/layout.ts";

const OVERRIDE_KEY: Deno.KvKey = ["content", "contact"];

/**
 * The four editable fields, and nothing else. Anything not named here cannot be
 * written even if it is posted — the schema strips it.
 */
export const ContactSchema = z.object({
  email: z.email("That does not look like an email address.").max(254),
  phone: z
    .string()
    .trim()
    .min(7, "That is too short to be a phone number.")
    .max(24)
    .regex(/^[0-9+().\- ]+$/, "Digits, spaces and + ( ) - only."),
  phoneHref: z
    .string()
    .trim()
    .max(40)
    .regex(/^(sms|tel):\+?[0-9]+$/, "Must be an sms: or tel: link, like sms:+14059847036."),
  phoneNote: z.string().trim().min(2).max(80),
});

export type ContactPatch = z.infer<typeof ContactSchema>;

export interface ContactStore {
  /** The details in force: committed defaults with any overrides applied. */
  current(): ContactDetails;
  /** The serialised JSON-LD for the details in force. */
  jsonLd(): string;
  /** The hashes the policy must admit for those exact scripts. */
  scriptHashes(): readonly string[];
  /** True when the details differ from what is committed. */
  overridden(): boolean;
  save(patch: ContactPatch): Promise<void>;
  /** Drop the override and go back to the committed values. */
  reset(): Promise<void>;
  /** Re-read from KV and recompute the graph and its hashes. */
  refresh(): Promise<void>;
}

/**
 * Built once at startup and passed down like every other dependency. The
 * getters read this cache, so a page never has to await anything to render.
 */
export async function createContactStore(kv: Deno.Kv, origin: string): Promise<ContactStore> {
  let details: ContactDetails = defaultContact;
  let json = "";
  let hashes: readonly string[] = [];
  let hasOverride = false;

  async function recompute(): Promise<void> {
    json = structuredData(origin, details);
    hashes = await inlineScriptHashes(json);
  }

  async function refresh(): Promise<void> {
    const stored = (await kv.get<Partial<ContactDetails>>(OVERRIDE_KEY)).value;
    hasOverride = stored !== null;
    // Spread order is the whole policy: committed values first, stored fields
    // on top, and only the fields actually stored.
    details = stored === null ? defaultContact : { ...defaultContact, ...stored };
    await recompute();
  }

  await refresh();

  return {
    current: () => details,
    jsonLd: () => json,
    scriptHashes: () => hashes,
    overridden: () => hasOverride,
    async save(patch) {
      await kv.set(OVERRIDE_KEY, ContactSchema.parse(patch));
      // The graph and the policy are rebuilt before this resolves, so no
      // request can be served with a hash that no longer matches the page.
      await refresh();
    },
    async reset() {
      await kv.delete(OVERRIDE_KEY);
      await refresh();
    },
    refresh,
  };
}
