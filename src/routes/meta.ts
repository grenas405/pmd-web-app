/**
 * meta.ts — the small text endpoints crawlers and monitors expect.
 *
 * All are pure functions of the configured origin, so they are generated once
 * per request with no I/O and no template.
 */

import { site } from "../content/site.ts";
import { CACHE_SHORT, textResponse } from "../http/respond.ts";

export function robotsTxt(origin: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /admin",
    "",
    `Sitemap: ${new URL("/sitemap.xml", origin).toString()}`,
    "",
  ].join("\n");
}

export function sitemapXml(origin: string, lastModified: Date): string {
  const day = lastModified.toISOString().slice(0, 10);
  const pages = ["/", "/thesis", "/pricing", "/thank-you"];
  const entries = pages
    .map((path) => {
      const loc = new URL(path, origin).toString();
      const priority = path === "/"
        ? "1.0"
        : (path === "/pricing" || path === "/thesis")
        ? "0.8"
        : "0.3";
      return `  <url><loc>${loc}</loc><lastmod>${day}</lastmod><priority>${priority}</priority></url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

export function humansTxt(): string {
  return [
    "/* TEAM */",
    `Engineer: ${site.name}`,
    `Site: ${site.domain}`,
    `Location: ${site.locality}, ${site.regionName}, USA`,
    "",
    "/* SITE */",
    "Runtime: Deno",
    "Server: Nginx -> Deno, Ubuntu LTS, systemd",
    "Standards: HTML, CSS, ES modules, Web Platform APIs",
    "Frameworks: none",
    "Components: @std/http, Zod, Anime.js",
    "Fonts: Fraunces (SIL Open Font License), self-hosted",
    "",
    "One person. One paradigm shift in web development.",
    "",
  ].join("\n");
}

export function manifestJson(): string {
  return JSON.stringify({
    name: `${site.name} — Software Engineering`,
    short_name: "P.M.D.",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#060b18",
    theme_color: "#060b18",
    icons: [
      { src: "/static/img/mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  });
}

export function textEndpoint(body: string, contentType: string): Response {
  return textResponse(body, { contentType, cacheControl: CACHE_SHORT });
}
