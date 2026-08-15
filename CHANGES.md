# Changes

## Unreleased

### The page speaks to business owners

- The hero's One/Zero/OKC figures are replaced by a **Claude Code session** — a request in plain
  English, two files written, the suite passing, the change deployed — animated with Anime.js in
  `static/js/session.js`. The transcript lives in `src/content/session.ts` as data and is rendered
  **complete** into the HTML; the script hides those lines and replays them. No JavaScript, reduced
  motion, or a thrown error all leave the finished session on screen, which is the same contract
  `typewriter.js` keeps with the rotating word. The figure is `aria-hidden` beside a one-sentence
  `visually-hidden` summary, so a screen reader hears what happened rather than every keystroke.
  Anime.js is imported only once the terminal is actually on screen — 42 KB does not belong in front
  of a hero that reads fine without it. The caption says the session is condensed, because a
  transcript that looks captured should either be captured or say that it is not.
- **`src/content/live.ts`** and a "Running right now" roster at the head of the work section: the
  four sites currently served from one box, linked by name and host, under the line that makes the
  point — _N sites · one engineer · one small server_. This is where "one person can run several web
  apps" stops being an adjective and becomes a number a visitor can click. `denogenesis.com` (502)
  and `pedromdominguez.com` (parked) were checked and left off.
- Copy across `site.ts` and `narrative.ts` moves from engineering to consequence: "local-first
  design" becomes "keeps working when the internet does not", "explicit permissions" becomes "locked
  down by default", and AI is described as doing the typing while judgment stays human. Hosting
  appears once, as the client's choice of a Contabo VPS, Deno Deploy, or their own server. Deno, the
  JSR standard library and Zod stay visible — as file names in the terminal and one line in the
  caption — without being explained at anyone.
- Fixed a horizontal scrollbar on phones. The hero title's lines were joined by `&nbsp;`, which made
  each one a single unbreakable token; at the title's clamped size that is about 430px against a
  335px content box on a 375px screen, so the tail of "Shift." hung past the right edge and the page
  scrolled sideways to reach it. Ordinary spaces now, with `text-wrap: balance` so a wrapped line
  splits evenly rather than stranding a word. A test asserts the non-breaking spaces do not come
  back.
- The live-site roster's three-column layout opened at `40rem`, where its combined track minimums
  (35rem plus gaps) exceeded what the gutter and panel padding leave — a second, narrower source of
  the same horizontal scroll, between roughly 640px and 768px. It now opens at `48rem` with smaller
  minimums.
- The vhost logs to `pedromdominguez-dev.access.log`. It shared `pedromdominguez.access.log` with
  portfolio-app's `.com` vhost, interleaving two sites in one file; the fail2ban `*access.log` glob
  still matches.

### Deployment

- Deployment now follows the layout the other Deno sites on this box use: `systemd/`, `nginx/`,
  `fail2ban/` and `scripts/` at the top level, in place of a single `deploy/` directory. The vhost
  is named after the site it serves (`nginx/pedromdominguez.dev`) rather than `nginx.conf`.
- The application runs **from the checkout** instead of a copy under `/srv/pmd-web`. There is no
  second tree to drift out of step with git; `systemctl cat pmd-web` names the directory you edit,
  and an update is `git pull` and a redeploy. The unit's `User=`, `Group=`, `WorkingDirectory=`,
  `ConditionPathExists=`, `BindReadOnlyPaths=` and `BindPaths=` are rewritten by `deploy.sh` for the
  host it runs on, so the committed file keeps one readable set of placeholder paths.
- It does not run **as** the user who owns that checkout. `pmdweb` — system account, no shell, no
  home — reaches the tree through the group, read-only, so a bug in the request path cannot rewrite
  the code that runs at the next restart; the owner keeps write access and needs no root to
  `git pull`. `var/` inverts it (`pmdweb:<owner>`, `2770`): the service writes the inbox, and the
  owner writes because `deno task verify` runs the suite there.
- `ProtectSystem=strict` and `ProtectHome=tmpfs`, with `BindReadOnlyPaths=` restoring exactly the
  checkout and `BindPaths=` restoring `var/`. The whole hierarchy is read-only to the process, every
  other home directory is an empty tmpfs, and file ownership says the same thing a second time. (An
  earlier revision of this entry claimed `strict` could not be used with a checkout under `/home`.
  That was wrong: `strict` mounts read-only, it does not hide — `ProtectHome=` is what hides.)
- `/etc/pmd-web/pmd-web.env` (`EnvironmentFile=-`), with `systemd/pmd-web.env.example` in the repo.
  Installed only when absent: it is the one file meant to diverge from git. The module cache moved
  to `/var/cache/pmd-web/deno` under `CacheDirectory=`, and the interpreter to `/usr/bin/deno`.
- The `listen` protocol options moved to `nginx/00-default-drop`, which is the first file nginx
  parses and therefore the one that gets to set them: `ssl` and `http2` describe an address:port,
  not a server block. The vhost's `listen 443;` lines are now bare and inherit both, which drops the
  "protocol options redefined for 0.0.0.0:443" warnings. The standalone `http2 on;` directive is
  gone with them — it needs nginx >= 1.25.1 and was an `unknown directive` error on anything older;
  `http2` as a listen parameter works on both.
- Box-wide hardening, tracked and installed by the same script: `nginx/snippets/deny-probes.conf`
  (444 on PHP/WordPress/dotfile probes, included by the vhost), `nginx/00-default-drop` (catch-all
  `default_server` closing the connection on any unmatched `Host`, and the distro default site
  removed), and `fail2ban/` — an `nginx-probes` jail, 3 strikes in 10 minutes, banned 24h. The jail
  needs `backend = polling` and a restart rather than a reload, both noted in the file. `jail.local`
  is installed only when absent, since the real sshd port belongs on the server and not in git.
- `scripts/deploy.sh` — the README's install flows as one idempotent script: preflight checks before
  the first change, `deno task verify` against the tree about to be put into service, the
  environment file, a module cache warmed as the service user for `--cached-only`, then unit
  install, restart, and a `/healthz` probe on the port read back out of the unit file. Nginx and
  fail2ban come last, the first only behind a passing `nginx -t`. Six flags and nine environment
  overrides for a differently laid-out host.
- Certificates are part of that script rather than a separate errand. It issues with
  `certbot certonly --webroot` before Nginx, since the vhost names its key material by absolute path
  and will not load without it; a first run breaks the ACME chicken-and-egg with a temporary
  plaintext server block serving only `/.well-known/acme-challenge/`, and a host that already holds
  the lineage renews with no downtime at all. Preflight refuses a lineage name that disagrees with
  the path in `nginx.conf`, which would otherwise install a certificate nobody renews.
  `certbot.timer` is enabled and a deploy hook reloads Nginx after renewal — otherwise Nginx serves
  the expired copy already in its memory. `--staging` rehearses against the staging CA,
  `--force-renewal` and `--skip-certbot` cover the rest.
- Default TCP port moved from `8000` to `8002`, in `src/config.ts` (`PORT` and `PUBLIC_ORIGIN`
  defaults), the systemd unit, the Nginx upstream and the README. Nothing hard-codes a port outside
  configuration, so a deployment that sets `PORT` explicitly is unaffected.

## 1.0.0 — 2026-08-08

First release: the complete site, server, and deployment.

### Server

- **Startup (`main.ts`)** — reads configuration, indexes and content-hashes the static assets,
  computes the Content-Security-Policy hash for the one inline script, then listens. Every
  dependency is constructed here and passed down; no module reaches for a global. SIGTERM and SIGINT
  drain in-flight requests.
- **Configuration (`src/config.ts`)** — eleven optional environment variables parsed by a Zod schema
  into a frozen record. Malformed values stop the process at startup. The only reader of `Deno.env`.
- **Routing (`src/http/router.ts`)** — `URLPattern` matching as a pure function returning a match, a
  method mismatch with a correct `Allow` list, or nothing. HEAD is served by GET routes; only
  GET/HEAD/POST/OPTIONS exist at all.
- **Application (`src/app.ts`)** — one `Request → Response` function that handles method screening,
  dispatch, error containment, security headers and access logging in a fixed order. Handlers know
  about none of it.
- **Logging (`src/log.ts`)** — one JSON line per event on stdout for journald. Control characters
  are flattened so a request path cannot forge a log entry; secret-looking keys are redacted by
  name; errors log their message, never a stack.

### Pages

- Single-page narrative in seven sections, answering in order: who is Pedro, what he builds, why the
  architecture matters to a business, how one developer competes with an agency, what has shipped,
  and how to start.
- Hero with a retyping discipline rotator; `/thank-you`, 404 and error pages share a narrow notice
  layout.
- Rendering is a pure function of (context, data) — no page opens a file or reads a clock beyond the
  footer's copyright year.
- Content lives in `src/content/` as plain data, separate from layout. The four portfolio entries
  are illustrative placeholders pending real engagements.

### Security

- The `html` tagged template escapes every interpolation; emitting raw markup requires an explicit
  `raw()` call.
- Content-Security-Policy of `default-src 'none'` with no `unsafe-inline`, no `unsafe-eval` and no
  wildcards. The JSON-LD block is admitted by a SHA-256 hash computed at startup over the exact
  emitted string, so policy and page cannot drift. No third-party assets: the font and Anime.js are
  vendored.
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` (every unused
  feature denied), both Cross-Origin policies, and HSTS with `upgrade-insecure-requests` when
  enabled.
- Contact endpoint gates cheapest-first: content type, `Origin` (a missing one is refused, not
  trusted), a 16 KB streaming cap that does not believe `Content-Length`, a bounded fixed-window
  rate limit with `Retry-After`, then the Zod schema. A filled honeypot is answered exactly like a
  success.
- Static file paths are resolved by a pure function tested against traversal, double-encoding,
  absolute paths, NUL bytes and backslashes, then re-checked after symlink resolution.
- Errors expose no exception text, stack, path or version. `/healthz` returns `{"status":"ok"}` and
  nothing else.

### Front end

- Server-rendered HTML that is complete before any script runs. Four optional, independently guarded
  ES modules: navigation, typewriter, reveal, contact.
- The contact form is a real `<form method="post">` answered with HTML (Post/Redirect/Get on
  success) and upgraded to `fetch` when JavaScript is available; the enhancement steps aside if
  anything fails.
- Anime.js drives the gold shooting stars, dynamically imported during idle time and skipped
  entirely under `prefers-reduced-motion: reduce`.
- Design system in one stylesheet: midnight-navy and gold, a vendored Fraunces variable display face
  over a system sans stack, mobile-first, fluid type.
- Assets are content-hashed at startup and served immutable for a year; everything else revalidates.

### Tests

81 tests over the pure and security-sensitive code: escaping, path resolution, routing, headers and
CSRF, body limits and content types, validation, rate limiting, log redaction, configuration, and
end-to-end request handling through `createApp` without opening a socket.

### Deployment

- `deploy/pmd-web.service` — systemd unit pairing minimal Deno permission flags with a kernel
  sandbox (`ProtectSystem=strict`, no capabilities, filtered syscalls, one writable directory),
  running `--cached-only` so the service never contacts a registry.
- `deploy/nginx.conf` — TLS, compression and connection limits only; it adds no headers that would
  duplicate and then contradict the application's.
