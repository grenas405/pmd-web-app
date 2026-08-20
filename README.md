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
deno task test     # 140 tests
deno task verify   # fmt --check, lint, type check, tests
deno task e2e      # the checks that need a real browser
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
| `src/content/*.ts`      | Copy, portfolio, pricing, the thesis and its sources — all as plain data    |
| `src/contact/*.ts`      | Contact schema (pure) and the enquiry store (the only writer)               |
| `static/`               | CSS, ES modules, images, vendored font and Anime.js                         |
| `systemd/`              | The unit and its optional environment file                                  |
| `nginx/`                | The vhost, plus the box-wide probe snippet and catch-all server             |
| `fail2ban/`             | The `nginx-probes` filter and jail                                          |
| `scripts/`              | `deploy.sh`: everything above, installed in one command                     |

### The rules the code follows

- **Escape by default.** Interpolating into the `html` tagged template escapes. Emitting raw markup
  requires calling `raw()`, which makes every such decision greppable.
- **Validate at the boundary.** Untrusted input is parsed by a Zod schema before anything downstream
  sees it, and the parsed value is the only thing that travels onward.
- **Pure where possible.** Path resolution, routing, escaping, validation, rate limiting and page
  rendering are pure functions — which is why they have tests.
- **I/O is named and contained.** Exactly one module persists anything (`src/contact/store.ts`,
  which writes to Deno KV), one reads files (`src/http/static.ts`, plus asset indexing), one reads
  the environment (`src/config.ts`). The KV handle is opened once in `main.ts` and passed down like
  every other dependency — no module reaches for a global.

---

## Security

The posture is deny-by-default, and it is enforced in three places that have to agree: the Deno
permission flags, the systemd sandbox, and the code.

**Content-Security-Policy.** `default-src 'none'` with no `unsafe-inline`, no `unsafe-eval`, and no
wildcards. Two inline scripts — the JSON-LD metadata and a one-line flag saying JavaScript is
running — are each admitted by their SHA-256 hash, computed at startup by `inlineScriptHashes()` in
`src/render/layout.ts`, the module that also emits them, so the policy and the page cannot drift
apart. A test reads every inline script back out of the served HTML and checks its hash is in the
header, so a third one added and forgotten fails the suite rather than a browser console. There are
no third-party assets of any kind: no CDN, no analytics, no remote fonts.

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
| `INBOX_PATH`                  | `var/inbox.jsonl`       | Legacy JSON Lines inbox; historical records only    |
| `KV_PATH`                     | `var/kv.sqlite3`        | Deno KV database holding enquiries                  |
| `APP_ENV`                     | `development`           | `production` raises the log threshold               |
| `ENABLE_HSTS`                 | `false`                 | Send HSTS + `upgrade-insecure-requests`. HTTPS only |
| `TRUST_PROXY`                 | `false`                 | Honour `X-Forwarded-For`. True only behind a proxy  |
| `CONTACT_RATE_LIMIT`          | `5`                     | Submissions allowed per client per window           |
| `CONTACT_RATE_WINDOW_SECONDS` | `600`                   | Length of that window                               |

---

## Production Deployment

Ubuntu LTS, Nginx, systemd, fail2ban — the same layout as the other Deno sites on this box:
`systemd/` for the unit and its environment file, `nginx/` for the vhost and the box-wide hardening,
`fail2ban/` for the jail, `scripts/` for the one command that installs all of it.

```sh
sudo scripts/deploy.sh
```

The application runs **from the checkout**, but not **as** the user who owns it. There is no second
copy under `/srv` to drift out of step with git — `systemctl cat pmd-web` names the directory you
edit — and the code is still not writable by the process running it: the owner has write access and
needs no root to `git pull`, while the service account `pmdweb` (no shell, no home) reaches the tree
through the group, read-only.

```sh
cd ~/.local/src/development/pmd-web-app
git pull && sudo scripts/deploy.sh --skip-certbot
```

`deploy.sh` is the install flows below in the same order, made idempotent and made to stop at the
first thing that goes wrong. It verifies the tree before installing anything, so a failing test
suite is a message rather than a bad deployment; it warms the module cache as the service user so
`--cached-only` holds; it rewrites the unit's paths for this host; and it does not call the
deployment finished until `127.0.0.1:<PORT>/healthz` answers — the port read back out of the unit
file, so the check cannot drift from what was installed.

It needs `deno` at `/usr/bin/deno`, plus `nginx`, `certbot` and `fail2ban`, the DNS records already
pointing at the host, and 80/tcp reachable for the ACME challenge.

| Flag              | Effect                                                          |
| ----------------- | --------------------------------------------------------------- |
| `--skip-verify`   | Redeploy a tree that was already verified                       |
| `--skip-nginx`    | Service only; the proxy lives elsewhere. Implies the next       |
| `--skip-certbot`  | Leave certificates alone                                        |
| `--skip-fail2ban` | Leave the jail and the probe filter alone                       |
| `--staging`       | Issue from the staging CA: untrusted, but not rate limited      |
| `--force-renewal` | Renew a certificate that is still valid. Rate limited by the CA |

`APP_DIR`, `OWNER_USER`, `OWNER_GROUP`, `SERVICE_USER`, `SERVICE_GROUP`, `SERVICE_NAME`,
`SITE_NAME`, `ENV_FILE`, `CERT_DOMAINS`, `CERTBOT_EMAIL` and `WEBROOT` can be overridden from the
environment (`sudo -E`).

### systemd

The unit is [systemd/pmd-web.service](systemd/pmd-web.service), with an optional environment file at
[systemd/pmd-web.env.example](systemd/pmd-web.env.example). It assumes:

- the checkout is at `~/.local/src/development/pmd-web-app`, owned by you, group `pmdweb`, group
  read-only — the service can execute the code and never alter it
- Deno is installed at `/usr/bin/deno`
- the module cache is `/var/cache/pmd-web/deno` (`CacheDirectory=`), so the unit can run
  `--cached-only` and never contact a registry — not at start, not after a restart at 3am
- `var/` inside the checkout is the only writable path, and holds the enquiry database. It is
  `pmdweb:<you>` mode `2770`, because the service writes it and `deno task verify` runs the suite in
  the same directory
- `--unstable-kv` is on the `ExecStart` line, because `Deno.openKv` needs it. The database is a file
  inside `var/`, so it costs no permission the service did not already have — but without the flag
  the process exits at startup, which is why the flag and the code deploy together
- the app listens on `127.0.0.1:8002`

The kernel says the same thing the file modes do. `ProtectSystem=strict` mounts the entire hierarchy
read-only and `ProtectHome=tmpfs` replaces every home directory with an empty tmpfs;
`BindReadOnlyPaths=` then restores exactly this checkout, and `BindPaths=` restores `var/`. Nothing
else on the filesystem exists as far as the process is concerned, and the two writable paths are
`var/` and the module cache that `CacheDirectory=` provides.

`deploy.sh` rewrites `User=`, `Group=`, `WorkingDirectory=`, `ConditionPathExists=`,
`BindReadOnlyPaths=` and `BindPaths=` for the host it runs on, so the committed unit keeps one set
of readable placeholder paths instead of one commit per machine. Everything else — the Deno
permission allowlist, the syscall filter, the empty capability bounding set — is the same in git and
on the server. `/etc/pmd-web/pmd-web.env` overrides any of it and is installed **only when absent**:
it is the one file meant to diverge from the repository.

```sh
sudo install -o root -g root -m 0644 systemd/pmd-web.service /etc/systemd/system/pmd-web.service
sudo install -d -m 0755 /etc/pmd-web
sudo install -o root -g root -m 0640 systemd/pmd-web.env.example /etc/pmd-web/pmd-web.env
sudo systemctl daemon-reload && sudo systemctl enable --now pmd-web.service

sudo systemd-analyze verify /etc/systemd/system/pmd-web.service
journalctl -u pmd-web -f --output cat | jq .
sudo -u pmdweb deno task inbox | jq .   # enquiries live in KV, owned by the service

# Every failed request carries a five-character incident code, shown on the page
# and written to the journal. Given a code, the failure is one grep away:
journalctl -u pmd-web --output cat | grep 7QK2M | jq .

# Set or change the admin password. As root, and the reason is worth knowing:
# the KV file is 0640 owned by pmdweb, so you cannot write it as yourself — but
# `sudo -u pmdweb` fails too, because sudo does not change directory and pmdweb
# cannot traverse your 0750 home to reach the checkout. That account is meant to
# be unable to; the service only reaches the code through systemd's bind mounts.
# DENO_DIR reuses the cache deploy.sh warmed, so this fetches nothing.
sudo DENO_DIR=/var/cache/pmd-web/deno deno task admin-password

# Then check nothing root-owned was left behind. SQLite's -wal/-shm sidecars are
# removed when the script closes KV, but a crash could strand one, and the
# service would not be able to write past it.
ls -l var/
```

#### When the service cannot write its database

The symptom is specific and misleading: pages render, sign-in returns 500, and the contact form
answers "I could not store that message." Reads work and writes do not, so nothing looks broken from
the outside.

`Deno.openKv` succeeds on a database it cannot write, so a healthy-looking service proves nothing.
Since the startup probe landed, the journal says so directly at boot:

```sh
journalctl -u pmd-web --output cat | grep kv.readonly | jq .
```

The cause is ownership. `var/` and everything in it must be writable by the service account:

```sh
ls -l var/                              # want: pmdweb, group-writable
sudo chown -R pmdweb:sysadmin var
sudo chmod 2770 var
sudo systemctl restart pmd-web
```

`deploy.sh` now verifies this before it finishes and refuses to complete a deploy that would leave
the database unwritable — a recursive `chmod` over the checkout used to strip group-write from the
database on its way past.

### Server hardening (nginx + fail2ban)

The VPS sees constant automated scanning for PHP/WordPress paths (`/xyz.php`, `/wp-admin/...`).
Nothing on the box runs PHP, so any such request is a scanner. Three tracked configs shut that
traffic down, and two of the three are box-wide rather than per site:

- [nginx/snippets/deny-probes.conf](nginx/snippets/deny-probes.conf) — location blocks returning
  `444` (connection closed, no response) for `.php`/WordPress/dotfile probes. Included by the vhost;
  add the same `include snippets/deny-probes.conf;` line to any other vhost on the box.
- [nginx/00-default-drop](nginx/00-default-drop) — catch-all `default_server` for 80/443 that closes
  the connection on any request whose `Host` matches no configured vhost (bare-IP scans, forged Host
  headers). Without it, nginx falls back to the first vhost alphabetically, which is how scanners
  end up receiving a real site's redirect.
- [fail2ban/](fail2ban/) — an `nginx-probes` jail (3 probe requests within 10 minutes → source IP
  banned from 80/443 for 24h) plus the stock `sshd` jail. Two gotchas are in the comments of
  [fail2ban/jail.local](fail2ban/jail.local): fail2ban must be **restarted** after the config lands,
  and the jail needs `backend = polling` or it reads the journal, where nginx access logs never
  appear. `deploy.sh` installs `jail.local` only when absent — the real sshd port is an edit that
  belongs on the server and not in git.

The vhost is [nginx/pedromdominguez.dev](nginx/pedromdominguez.dev): TLS, compression, per-site logs
and connection limits only. It adds no security headers, because those are the application's and two
copies would drift apart. Its access log is named `/var/log/nginx/pedromdominguez-dev.access.log` —
`-dev` because portfolio-app's `.com` vhost already owns `pedromdominguez.access.log` on this box,
and two sites interleaved in one log is nobody's idea of a good afternoon. The `*access.log` glob
still puts it inside the fail2ban jail.

```sh
sudo install -o root -g root -m 0644 nginx/snippets/deny-probes.conf /etc/nginx/snippets/deny-probes.conf
sudo install -o root -g root -m 0644 nginx/00-default-drop /etc/nginx/sites-available/00-default-drop
sudo install -o root -g root -m 0644 nginx/pedromdominguez.dev /etc/nginx/sites-available/pedromdominguez.dev
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/00-default-drop /etc/nginx/sites-enabled/00-default-drop
sudo ln -sf /etc/nginx/sites-available/pedromdominguez.dev /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo apt install -y fail2ban
sudo install -o root -g root -m 0644 fail2ban/filter.d/nginx-probes.conf /etc/fail2ban/filter.d/nginx-probes.conf
sudo install -o root -g root -m 0644 fail2ban/jail.local /etc/fail2ban/jail.local
sudo systemctl restart fail2ban
sudo fail2ban-client status nginx-probes   # must show "File list:", not "Journal matches:"
```

Verification:

```sh
curl -so /dev/null -w '%{http_code}\n' https://pedromdominguez.dev/test.php   # 000 (closed)
curl -so /dev/null -w '%{http_code}\n' http://<server-ip>/anything            # 000
curl -so /dev/null -w '%{http_code}\n' https://pedromdominguez.dev/           # 200
sudo fail2ban-regex /var/log/nginx/access.log /etc/fail2ban/filter.d/nginx-probes.conf
```

### Certificates

Handled by `deploy.sh` before Nginx, because the vhost names its key material by absolute path and
would not load without it. The first run has a chicken and egg to break — the certificate needs an
answered HTTP challenge, the configuration needs the certificate — so it puts up a plaintext server
block that serves `/.well-known/acme-challenge/` and answers everything else with 503, issues, then
replaces it with the real configuration. A host that already holds the lineage skips the bootstrap
entirely: its live configuration already serves the challenge from the same webroot, and renewal
costs no downtime.

TLS settings are written out in the vhost rather than pulled in from
`/etc/letsencrypt/options-ssl-nginx.conf`, so reading that one file tells you the whole policy and a
fresh host needs nothing from Certbot but the key material itself.

Renewal is `certbot.timer`, which the script enables. Certbot renews the file but Nginx goes on
serving the copy in its memory, so the script also installs
`/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh` — the half of renewal that is the
deployment's responsibility. Rehearse against the staging CA first; the real one is rate limited to
five failures an hour per account.

```sh
sudo scripts/deploy.sh --staging    # rehearse: untrusted cert, no rate limit
sudo scripts/deploy.sh              # then the real one
sudo certbot certificates           # what is on disk and when it expires

sudo install -d -m 0755 /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot \
  --cert-name pedromdominguez.dev \
  -d pedromdominguez.dev -d www.pedromdominguez.dev \
  --non-interactive --agree-tos -m you@example.com --keep-until-expiring
```

---

## Editing the site

Content is data, kept apart from the code that renders it:

- `src/content/site.ts` — name, email, links, the hero's rotating disciplines
- `src/content/narrative.ts` — the argument: approach, advantage, process
- `src/content/projects.ts` — the portfolio: two real engagements, Heavenly Roofing and Mercy Seat
  Ministries
- `src/content/live.ts` — the sites running right now, which the roster and the hero both draw on

> Case studies are **real engagements only**. A test refuses any entry whose `href` is not a host on
> the roster in `live.ts`, for the same reason the hero rotation carries the same rule: a claim a
> visitor can disprove in one click costs more than the claim was ever worth. The four fictional
> placeholders that once filled this section were deleted outright rather than kept for reference.

---

## Front end

Server-rendered HTML that is complete before any script runs. JavaScript is four small ES modules,
each optional and independently guarded — if one throws, the others still run and the page still
works:

- `nav.js` — the full-screen menu, scrolled state, current-section marking
- `typewriter.js` — the hero's rotating discipline (first word is in the HTML)
- `reveal.js` — fades in sections that are below the fold, and only those
- `contact.js` — upgrades the real `<form>` to `fetch`; falls back to a normal POST if anything goes
  wrong
- `session.js` — replays the hero's Claude Code session, rotating through three clients (the first
  transcript is already in the HTML)
- `splash.js` — opens the launch-offer dialog, once, to a visitor who is actually reading
- `layers.js` — reveals the six-layer stack on the landing page (the diagram is already in the HTML)
- `coderain.js` — the scrolling pseudo-code behind the admin sign-in, and nowhere else

`sky.js` — the gold shooting stars — is dynamically imported during idle time, and never at all when
the visitor prefers reduced motion.

Anime.js has exactly two callers, `sky.js` and `session.js`, and neither loads it eagerly: the sky
waits for idle, and the session waits until the hero terminal is actually on screen. The vendored
build is 42 KB, which is too much to put in front of a hero that is already readable without it.

The navigation keeps the same contract from the other direction. The links are ordinary anchors in
the markup, and the stylesheet decides how they are presented: with the enhancement flag set they
become a full-screen menu behind a button; without it they are a plain stacked list and there is no
button at all, because a button that needs a script to work is not navigation. Opening the menu
lazily imports Anime.js for the hairline sweep and the staggered rise, while the diagonal wipe is a
CSS `clip-path` transition — Anime.js cannot interpolate `polygon()` and would snap between shapes.
If that import fails, the menu still opens.

The hero session is worth understanding as a pattern, because it is the same contract every
enhancement here keeps. `src/content/session.ts` holds the transcript as data; `home.ts` renders
**every line of it, finished**, into the HTML; `session.js` then hides those lines and brings them
back in order. Turn JavaScript off, prefer reduced motion, or let the module throw, and the visitor
reads a completed session rather than an empty box. The figure is `aria-hidden` with a one-sentence
`visually-hidden` summary beside it, so a screen reader hears what happened instead of every typed
character.

It rotates. `session.ts` is one workflow — `sessionFor()` — applied to three real businesses, and
each loop retypes the prompt for the next one. That is the page's argument in miniature: the same
prompt, the same five steps and the same deploy command produce a web app for a roofer, a church or
a technology firm, which is the only reason one engineer can keep several of them running.

Two constraints hold it together, both enforced by tests. Every subject must produce **the same rows
in the same order** — only the text differs — because the script writes onto the rows already in the
DOM rather than rebuilding the list, and a mismatched entry would blend half of one business with
half of another. And every host the hero names must appear in `live.ts`, because the roster below it
is checkable and a claim a visitor can disprove in one click is worse than no claim at all. The
other subjects reach the browser as an escaped `data-sessions` attribute, the same trick the hero
typewriter uses for its words, so the Content-Security-Policy still needs no nonce.

The promotional splash is the one thing on the page that interrupts, so it is built to interrupt as
little as possible. It is a native `<dialog>` served **without** `open` — closed in every browser,
and closed forever for a visitor with no JavaScript, who would otherwise meet a modal with nothing
to dismiss it. `showModal()` supplies focus containment, Escape, the backdrop and focus restoration,
none of which is worth hand-rolling. It opens only once six seconds have passed **and** the reader
is a quarter of the way down, then records that in `localStorage` so the same person is never
interrupted twice. Requiring the scroll is deliberate: Google's "intrusive interstitial" guidance
targets popups that cover content on arrival from search, and this one cannot appear to anybody who
has not stayed to read. It also refuses to open over the full-screen menu, and is rendered as a
sibling of `<main>` rather than inside it — `nav.js` marks `main, footer` inert while the menu is
open, and `inert` still applies to a top-layer dialog nested beneath it.

Accessibility and motion: one `<h1>`, no heading-level jumps, labels bound to every input, a skip
link, visible focus rings, and `prefers-reduced-motion: reduce` honoured by both the CSS and the
scripts.

### The admin area

`/admin` is a sign-in page and `/admin/dashboard` is behind it. **Nothing links to either**, they
are not in the sitemap, `robots.txt` disallows them and every response carries
`X-Robots-Tag: noindex` and `Cache-Control: no-store`. That is housekeeping, not the control — the
control is a session check on every route and an `Origin` check on every write.

The password is set from the command line, never through a form:
`sudo -u pmdweb deno task
admin-password`. It is stored as PBKDF2-HMAC-SHA256 at 210,000 iterations
with a random salt, using Web Crypto — no new dependency — and compared in constant time. Failed
attempts are counted **in KV, not in memory**: the in-memory limiter used by the contact form resets
on every restart, which would hand an attacker a fresh budget of guesses with every deploy.

The dashboard reads the enquiries and edits exactly four fields: email, phone, the `sms:` link and
the note beside it. Everything else — copy, prices, case studies, every cited figure — stays in
version control where the tests guard it. KV is an override layer, so an empty database renders the
committed site exactly.

Those four fields carry a trap worth knowing about. They appear inside the JSON-LD, and the JSON-LD
is admitted by the Content-Security-Policy through its SHA-256. Change the phone number and the
emitted graph no longer matches the hash in the header, so the browser blocks it: structured data
disappears from search results and the only symptom is a console message. `src/admin/contact.ts`
therefore recomputes the details, the graph and its hash together on every write, and a test changes
the number and then re-checks that every inline script the page emits is still admitted.

### Browser tests

`deno task e2e` drives a real Chromium at phone, tablet and laptop widths. It exists because every
bug a person has found in this site has been a rendering bug — a hero wider than the phone it was
on, a sticky header that stopped sticking, a menu button buried under its own panel, a menu that
opened as a strip across the masthead. None of them are wrong in the HTML, so none of them could
fail in `tests/`; they only exist once a browser has laid the page out. Each case in
`e2e/site_e2e.ts` is one that actually happened.

The files are named `*_e2e.ts`, **not** `*_test.ts`, and deliberately so: `deno test` with no path
walks the whole project, and `scripts/deploy.sh` runs `deno task verify` on the VPS, where there is
no browser to drive. `deno task test` is pinned to `tests/` for the same reason.

```sh
deno run -A npm:playwright install chromium   # one time
deno task e2e
```

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
