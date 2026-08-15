/**
 * site.ts — identity, navigation and contact details.
 *
 * Content lives in plain data modules so that changing what the site *says*
 * never means touching how the site *works*. Edit this file to rebrand.
 */

export interface NavLink {
  readonly href: string;
  readonly label: string;
  /**
   * Zero-padded, in the same style the section labels on the page use. Shown
   * in the full-screen menu and hidden on desktop, where the nav is a row.
   */
  readonly index: string;
  /** One line saying what is down there. Menu only. */
  readonly description: string;
}

export const site = {
  name: "Pedro M. Dominguez",
  role: "Software Engineer · Oklahoma City",
  domain: "pedromdominguez.dev",
  tagline: "One Person. One Paradigm Shift.",
  description:
    "Pedro M. Dominguez builds and looks after websites and business software for Oklahoma City " +
    "companies. One engineer, working with AI, at a pace that used to take a whole agency.",
  email: "pedro.dfedro@gmail.com",
  github: "https://github.com/grenas405",
  locality: "Oklahoma City",
  region: "OK",
  regionName: "Oklahoma",
  country: "US",
  /**
   * Rotated through by the hero typewriter. Short phrases read best, and each
   * one names something a business owner would recognise wanting — not a
   * technology they would have to look up.
   */
  disciplines: [
    "Business Websites",
    "Quote & Booking Forms",
    "Customer Portals",
    "Software That Works Offline",
    "Someone Who Answers",
  ],
} as const;

export const nav: readonly NavLink[] = [
  {
    href: "#approach",
    label: "Approach",
    index: "01",
    description: "How the work gets done",
  },
  {
    href: "#work",
    label: "Work",
    index: "02",
    description: "Sites running right now",
  },
  {
    href: "#advantage",
    label: "Advantage",
    index: "03",
    description: "Why one person, not a firm",
  },
  {
    href: "#process",
    label: "Process",
    index: "04",
    description: "From counter to launch",
  },
  {
    href: "#contact",
    label: "Contact",
    index: "05",
    description: "Start a project",
  },
];

/** Absolute URL for a site-relative path, for canonical tags and metadata. */
export function absoluteUrl(origin: string, path: string): string {
  return new URL(path, origin).toString();
}

/**
 * JSON-LD describing the person and the practice. Serialised once at startup so
 * its Content-Security-Policy hash stays stable across requests.
 */
export function structuredData(origin: string): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${origin}/#pedro`,
        name: site.name,
        url: origin,
        email: `mailto:${site.email}`,
        jobTitle: "Software Engineer",
        sameAs: [site.github],
        address: {
          "@type": "PostalAddress",
          addressLocality: site.locality,
          addressRegion: site.region,
          addressCountry: site.country,
        },
        // Phrased the way someone searches for this work, not the way it is
        // built. The stack is in the source for anyone who wants it.
        knowsAbout: [
          "Web design and development",
          "Small business websites",
          "Custom business software",
          "Website hosting and maintenance",
          "Web application security",
        ],
      },
      {
        "@type": "ProfessionalService",
        "@id": `${origin}/#practice`,
        name: `${site.name} — Software Engineering`,
        url: origin,
        description: site.description,
        founder: { "@id": `${origin}/#pedro` },
        areaServed: {
          "@type": "City",
          name: site.locality,
          containedInPlace: { "@type": "State", name: site.regionName },
        },
      },
    ],
  });
}
