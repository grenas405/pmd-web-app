/**
 * site.ts — identity, navigation and contact details.
 *
 * Content lives in plain data modules so that changing what the site *says*
 * never means touching how the site *works*. Edit this file to rebrand.
 */

export interface NavLink {
  readonly href: string;
  readonly label: string;
}

export const site = {
  name: "Pedro M. Dominguez",
  role: "Software Engineer · Oklahoma City",
  domain: "pedromdominguez.dev",
  tagline: "One Person. One Paradigm Shift.",
  description:
    "Pedro M. Dominguez builds secure, local-first software for Oklahoma City businesses — " +
    "small architectures, minimal dependencies, and AI-augmented delivery at agency speed.",
  email: "pedro.dfedro@gmail.com",
  github: "https://github.com/grenas405",
  locality: "Oklahoma City",
  region: "OK",
  regionName: "Oklahoma",
  country: "US",
  /** Rotated through by the hero typewriter. Short phrases read best. */
  disciplines: [
    "Web Development",
    "Local-First Software",
    "Business Software",
    "AI-Augmented Engineering",
    "Secure Systems",
  ],
} as const;

export const nav: readonly NavLink[] = [
  { href: "#approach", label: "Approach" },
  { href: "#work", label: "Work" },
  { href: "#advantage", label: "Advantage" },
  { href: "#process", label: "Process" },
  { href: "#contact", label: "Contact" },
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
        knowsAbout: [
          "Deno",
          "TypeScript",
          "Web application security",
          "Local-first software",
          "Systems architecture",
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
