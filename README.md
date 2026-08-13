# pedromdominguez.dev

**One Person. One Paradigm Shift.**

The personal site of Pedro M. Dominguez — software engineer, Oklahoma City. It is also the argument
it makes: a production web application built from the Deno runtime, the standard library, Zod, and
Web Platform APIs. No framework, no build step, no bundler, no CSS pipeline, no client-side router.

```
Internet → Nginx → Deno → application functions
```

---

## Quick start

Requires [Deno](https://deno.com) 2.x. Nothing else — there is no `npm install` and no build.

```sh
deno task dev      # http://127.0.0.1:8002 with file watching
deno task test     # 81 tests
deno task verify   # fmt --check, lint, type check, tests
```

To run it the way production does:

```sh
deno task start
```

---

## Architecture

Each module does one thing and can be read on its own. Nothing imports configuration or a logger
from a global; dependencies arrive as parameters from `main.ts`, which is the only place that
touches the environment.

| Path                    | Responsibility                                                              |
| ----------------------- | --------------------------------------------------------------------------- |
| `main.ts`               | Startup: read config, index assets, compute the CSP hash, listen            |
| `src/config.ts`         | Environment → validated, frozen config (Zod). The only reader of `Deno.env` |
| `src/log.ts`            | One JSON line per event on stdout, with redaction                           |
| `src/app.ts`            | Route table plus the single `Request → Response` function                   |
| `src/http/router.ts`    | `URLPattern` matching. Pure; returns a match, a 405, or nothing             |
| `src/http/security.ts`  | Security headers, Content-Security-Policy, origin checks                    |
| `src/http/static.ts`    | Static files, with path resolution written to be attacked                   |
| `src/http/assets.ts`    | Content-hashes every static file once, at startup                           |
| `src/http/body.ts`      | Size-capped body reading and submission parsing                             |
| `src/http/ratelimit.ts` | Bounded in-memory fixed-window counters                                     |
| `src/http/respond.ts`   | Response constructors and public status messages                            |
| `src/render/html.ts`    | The `html` tagged template that escapes by default                          |
| `src/render/layout.ts`  | Document shell: head, masthead, footer, sky                                 |
| `src/pages/*.ts`        | Page composition. Pure functions of (context, data)                         |
| `src/content/*.ts`      | Copy and portfolio entries, as plain data                                   |
| `src/contact/*.ts`      | Contact schema (pure) and inbox append (the only disk write)                |
| `static/`               | CSS, ES modules, images, vendored font and Anime.js                         |
| `deploy/`               | Nginx site and the systemd unit                                             |

### The rules the code follows

- **Escape by default.** Interpolating into the `html` tagged template escapes. Emitting raw markup
  requires calling `raw()`, which makes every such decision greppable.
- **Validate at the boundary.** Untrusted input is parsed by a Zod schema before anything downstream
  sees it, and the parsed value is the only thing that travels onward.
- **Pure where possible.** Path resolution, routing, escaping, validation, rate limiting and page
  rendering are pure functions — which is why they have tests.
- **I/O is named and contained.** Exactly one module writes to disk (`src/contact/inbox.ts`), one
  reads it (`src/http/static.ts`, plus asset indexing), one reads the environment (`src/config.ts`).

---

## Security

The posture is deny-by-default, and it is enforced in three places that have to agree: the Deno
permission flags, the systemd sandbox, and the code.

**Content-Security-Policy.** `default-src 'none'` with no `unsafe-inline`, no `unsafe-eval`, and no
wildcards. The single inline script — the JSON-LD metadata — is admitted by its SHA-256 hash,
computed at startup from the exact string the renderer emits, so the policy and the page cannot
drift apart. There are no third-party assets of any kind: no CDN, no analytics, no remote fonts.

**Also sent on every response:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` denying every feature the
site does not use, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, and
`Strict-Transport-Security` when `ENABLE_HSTS=true`.

**The contact endpoint** — the only route that changes state — applies its gates cheapest-first:
content type, then `Origin` (a missing `Origin` is refused, not trusted), then a 16 KB streaming
size cap that does not believe `Content-Length`, then the rate limit, then the schema. A filled
honeypot is answered exactly like a success so a bot learns nothing. Submissions are appended to a
JSON Lines file with mode `0600`.

**Errors** reveal nothing: no exception text, no stack traces, no filesystem paths, no version
numbers. `/healthz` answers `{"status":"ok"}` and nothing else, because a health endpoint that
describes the system is a reconnaissance endpoint.

**Logs** are one JSON line per event, with control characters flattened (a newline in a request path
would otherwise let a client forge a log entry) and secret-looking keys redacted by name.

To review the security-relevant behaviour, read the tests: `tests/static_test.ts` (traversal),
`tests/security_test.ts` (headers, CSRF), `tests/body_test.ts` (size limits, content types),
`tests/html_test.ts` (XSS), and the injection cases in `tests/app_test.ts`.

---

## Configuration

Every knob, all of them optional, validated at startup — a malformed value stops the process rather
than producing surprising behaviour later.

| Variable                      | Default                 | Meaning                                             |
| ----------------------------- | ----------------------- | --------------------------------------------------- |
| `PORT`                        | `8002`                  | TCP port                                            |
| `HOST`                        | `127.0.0.1`             | Bind address. Keep it loopback behind Nginx         |
| `PUBLIC_ORIGIN`               | `http://localhost:8002` | Canonical origin for URLs and CSRF checks           |
| `TRUSTED_ORIGINS`             | _(empty)_               | Extra comma-separated origins accepted on POST      |
| `STATIC_DIR`                  | `static`                | Directory served at `/static/*`                     |
| `INBOX_PATH`                  | `var/inbox.jsonl`       | Where contact submissions are appended              |
| `APP_ENV`                     | `development`           | `production` raises the log threshold               |
| `ENABLE_HSTS`                 | `false`                 | Send HSTS + `upgrade-insecure-requests`. HTTPS only |
| `TRUST_PROXY`                 | `false`                 | Honour `X-Forwarded-For`. True only behind a proxy  |
| `CONTACT_RATE_LIMIT`          | `5`                     | Submissions allowed per client per window           |
| `CONTACT_RATE_WINDOW_SECONDS` | `600`                   | Length of that window                               |

---

## Deployment

Ubuntu LTS, Nginx, systemd. Everything is in `deploy/` and is commented.

```sh
sudo deploy/deploy.sh
```

That is the steps below, in the same order, made idempotent and made to stop at the first thing that
goes wrong. It verifies the tree before copying anything, so a failing test suite is a message
rather than a bad deployment; it warms the module cache as the service user; and it does not call
the deployment finished until `127.0.0.1:<PORT>/healthz` answers — the port read back out of the
unit file, so the check cannot drift from what was installed. Nginx is reloaded last, and only
behind a passing `nginx -t`.

| Flag            | Effect                                                |
| --------------- | ----------------------------------------------------- |
| `--skip-verify` | Redeploy a tree that was already verified             |
| `--skip-nginx`  | Service only; the reverse proxy lives on another host |

`APP_USER`, `APP_GROUP`, `APP_DIR`, `STATE_DIR`, `SERVICE_NAME` and `SITE_NAME` can be overridden
from the environment (`sudo -E`). What it does, should you prefer to do it by hand:

```sh
# 1. A user with no shell and no home directory to compromise.
sudo useradd --system --no-create-home --shell /usr/sbin/nologin pmdweb

# 2. The application.
sudo mkdir -p /srv/pmd-web
sudo rsync -a --delete --exclude var/ ./ /srv/pmd-web/
sudo chown -R root:root /srv/pmd-web        # the app cannot modify itself

# 3. Its one writable directory.
sudo install -d -o pmdweb -g pmdweb -m 0750 /var/lib/pmd-web

# 4. Warm the module cache so the service can run --cached-only, offline.
sudo -u pmdweb DENO_DIR=/var/lib/pmd-web/deno-cache \
  deno cache /srv/pmd-web/main.ts

# 5. Service and reverse proxy.
sudo install -m 0644 deploy/pmd-web.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now pmd-web

sudo install -m 0644 deploy/nginx.conf \
  /etc/nginx/sites-available/pedromdominguez.dev
sudo ln -s /etc/nginx/sites-available/pedromdominguez.dev /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

`--cached-only` means the running service never reaches out to a registry: dependency resolution
happened once, at deploy time, under review.

Read the mail:

```sh
sudo -u pmdweb tail -f /var/lib/pmd-web/inbox.jsonl | jq .
journalctl -u pmd-web -f --output cat | jq .
```

---

## Editing the site

Content is data, kept apart from the code that renders it:

- `src/content/site.ts` — name, email, links, the hero's rotating disciplines
- `src/content/narrative.ts` — the argument: approach, advantage, process
- `src/content/projects.ts` — the portfolio

> **The four portfolio entries are illustrative placeholders** written to show the shape of the
> section. Replace them with real engagements before the site goes live; the page renders whatever
> is in that array.

---

## Front end

Server-rendered HTML that is complete before any script runs. JavaScript is four small ES modules,
each optional and independently guarded — if one throws, the others still run and the page still
works:

- `nav.js` — mobile disclosure, scrolled state, current-section marking
- `typewriter.js` — the hero's rotating discipline (first word is in the HTML)
- `reveal.js` — fades in sections that are below the fold, and only those
- `contact.js` — upgrades the real `<form>` to `fetch`; falls back to a normal POST if anything goes
  wrong

`sky.js` — the gold shooting stars, and the only user of Anime.js — is dynamically imported during
idle time, and never at all when the visitor prefers reduced motion.

Accessibility and motion: one `<h1>`, no heading-level jumps, labels bound to every input, a skip
link, visible focus rings, and `prefers-reduced-motion: reduce` honoured by both the CSS and the
scripts.

---

## Third-party components

Four, all pinned, all self-hosted:

| Component                    | Version | Licence     | Why                                               |
| ---------------------------- | ------- | ----------- | ------------------------------------------------- |
| `@std/http`                  | 1.1.x   | MIT         | `serveFile`: correct ETag, Range and 304 handling |
| `@std/path`, `@std/encoding` | 1.x     | MIT         | Path normalisation, hex/base64                    |
| Zod                          | 4.x     | MIT         | Schema validation at every boundary               |
| Anime.js                     | 3.2.2   | MIT         | The shooting-star timeline (`static/vendor/`)     |
| Fraunces                     | v38     | SIL OFL 1.1 | Display typeface (`static/vendor/`, latin subset) |

---

## Licence

Source code © Pedro M. Dominguez. Vendored components keep their own licences, noted above and in
their file headers.
