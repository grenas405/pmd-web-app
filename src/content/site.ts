/**
 * site.ts — identity, navigation and contact details.
 *
 * Content lives in plain data modules so that changing what the site *says*
 * never means touching how the site *works*. Edit this file to rebrand.
 */

import { faq } from "./faq.ts";
import { plan } from "./pricing.ts";

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
  email: "domingueztechsolutions@gmail.com",
  /** Texting is the fastest way to reach him, and the only one advertised. */
  phone: "405-984-7036",
  phoneHref: "sms:+14059847036",
  phoneNote: "Text only",
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

/*
 * Rooted, not bare. `#contact` is relative to whatever page is being read, so
 * on /pricing it resolved to /pricing#contact and matched nothing. `/#contact`
 * is same-document scrolling on the landing page and a trip home from anywhere
 * else.
 */
export const nav: readonly NavLink[] = [
  {
    href: "/#approach",
    label: "Approach",
    index: "01",
    description: "How the work gets done",
  },
  {
    href: "/#work",
    label: "Work",
    index: "02",
    description: "Sites running right now",
  },
  {
    href: "/#advantage",
    label: "Advantage",
    index: "03",
    description: "Why one person, not a firm",
  },
  {
    href: "/#process",
    label: "Process",
    index: "04",
    description: "From counter to launch",
  },
  {
    href: "/pricing",
    label: "Pricing",
    index: "05",
    description: "What it costs, in full",
  },
  {
    href: "/#contact",
    label: "Contact",
    index: "06",
    description: "Start a project",
  },
];

/** Absolute URL for a site-relative path, for canonical tags and metadata. */
export function absoluteUrl(origin: string, path: string): string {
  return new URL(path, origin).toString();
}

/**
 * JSON-LD describing the person, the practice, what it costs and the questions
 * people ask. Serialised once at startup so its Content-Security-Policy hash
 * stays stable across requests.
 *
 * One `@graph` rather than several `<script>` blocks: the policy admits inline
 * scripts by hash, and every extra block would be another hash to compute and
 * keep in step. The FAQ and the offer are the same business as the Person above
 * them, so one graph is also the more accurate description.
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
        telephone: site.phone,
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
        // Texting is the only channel advertised, so it is the only one
        // described here. contactType is a free-text field; "text message"
        // is what a person would say.
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "text message",
          telephone: site.phone,
          email: site.email,
          areaServed: site.region,
          availableLanguage: "English",
        },
        makesOffer: {
          "@type": "Offer",
          "@id": `${origin}/pricing#${plan.id}`,
          name: `${plan.name} — website build and care`,
          url: `${origin}/pricing`,
          priceCurrency: "USD",
          price: plan.build,
          description:
            `$${plan.build} to design, build and launch on a ${plan.termMonths}-month agreement, ` +
            `then $${plan.care} a month for care, support and hosting. First year of domain ` +
            `management included; $${plan.firstYear} for the first year in total.`,
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${origin}/#faq`,
        mainEntity: faq.map((entry) => ({
          "@type": "Question",
          name: entry.question,
          acceptedAnswer: { "@type": "Answer", text: entry.answer },
        })),
      },
    ],
  });
}
