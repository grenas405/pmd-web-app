# Changes

## Unreleased

- Deployment now follows the layout the other Deno sites on this box use: `systemd/`, `nginx/`,
  `fail2ban/` and `scripts/` at the top level, in place of a single `deploy/` directory. The vhost
  is named after the site it serves (`nginx/pedromdominguez.dev`) rather than `nginx.conf`.
- The application runs **from the checkout**, as the user who owns it, instead of being copied to
  `/srv/pmd-web` under a dedicated system account. There is no second copy to drift out of step with
  git; `systemctl cat pmd-web` names the directory you edit, and an update is `git pull` and a
  redeploy. The unit's `User=`, `Group=`, `WorkingDirectory=`, `ConditionPathExists=` and
  `ReadWritePaths=` are rewritten by `deploy.sh` for the host it runs on, so the committed file
  keeps one readable set of placeholder paths. The trade is a service account that has a shell and a
  home directory; the Deno allowlist, syscall filter and empty capability bounding set are
  unchanged, and `ProtectSystem=full` with `ProtectHome=false` replaces `strict`, which cannot see a
  checkout under `/home`.
- `/etc/pmd-web/pmd-web.env` (`EnvironmentFile=-`), with `systemd/pmd-web.env.example` in the repo.
  Installed only when absent: it is the one file meant to diverge from git. The module cache moved
  to `/var/cache/pmd-web/deno` under `CacheDirectory=`, and the interpreter to `/usr/bin/deno`.
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
