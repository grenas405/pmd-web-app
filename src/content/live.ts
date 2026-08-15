/**
 * live.ts — the sites currently running, as data.
 *
 * This is the evidence for the claim the rest of the page makes: one engineer,
 * several businesses, one server. A count is harder to argue with than an
 * adjective.
 *
 * NOTE FOR THE OWNER: every entry here is a live host, and a visitor may well
 * click it. Check them before you add one — a 502 on this list costs more
 * credibility than a short list ever would. Verified with:
 *
 *   curl -sL -o /dev/null -w '%{http_code}\n' https://<host>
 */

export interface LiveSite {
  /** How the business is known, not its legal name. */
  readonly name: string;
  /** Hostname, no scheme. Used for both the link and the label. */
  readonly host: string;
  /** The trade, in the words a neighbour would use. */
  readonly sector: string;
}

export const liveSites: readonly LiveSite[] = [
  {
    name: "Heavenly Roofing",
    host: "heavenlyroofingllc.com",
    sector: "Roofing & claims",
  },
  {
    name: "Mercy Seat Ministries",
    host: "msmokc.org",
    sector: "Church",
  },
  {
    name: "Praxedis Technologies",
    host: "praxedistechnologies.com",
    sector: "Technology",
  },
  {
    name: "This site",
    host: "pedromdominguez.dev",
    sector: "Portfolio",
  },
];
