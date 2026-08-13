#!/usr/bin/env bash
#
# deploy.sh — put this working tree on the machine it is run on.
#
# The manual steps in README.md, in the same order, made idempotent and made to
# stop at the first thing that goes wrong. Running it twice changes nothing the
# second time; running it against a broken tree changes nothing at all, because
# the test suite runs before anything is copied.
#
#   sudo deploy/deploy.sh
#
# Nothing here is specific to one host beyond the variables below, and each of
# those can be overridden from the environment:
#
#   APP_USER=pmdweb APP_DIR=/srv/pmd-web sudo -E deploy/deploy.sh
#
set -euo pipefail

APP_USER="${APP_USER:-pmdweb}"
APP_GROUP="${APP_GROUP:-$APP_USER}"
APP_DIR="${APP_DIR:-/srv/pmd-web}"
STATE_DIR="${STATE_DIR:-/var/lib/pmd-web}"
SERVICE_NAME="${SERVICE_NAME:-pmd-web}"
SITE_NAME="${SITE_NAME:-pedromdominguez.dev}"

# Certificates. CERT_DOMAINS is a space-separated list; the first is the
# lineage name, which is what deploy/nginx.conf names in its ssl_certificate
# paths, so it has to stay in step with SITE_NAME.
CERT_DOMAINS="${CERT_DOMAINS:-$SITE_NAME www.$SITE_NAME}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-pedro.dfedro@gmail.com}"
WEBROOT="${WEBROOT:-/var/www/certbot}"

SKIP_VERIFY=0
SKIP_NGINX=0
SKIP_CERTBOT=0
CERTBOT_STAGING=0
FORCE_RENEWAL=0

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_SRC="$REPO_ROOT/deploy/$SERVICE_NAME.service"
NGINX_SRC="$REPO_ROOT/deploy/nginx.conf"

# --- output ------------------------------------------------------------------
# stderr, so that stdout stays empty and the script can be piped without noise.

step() { printf '\n\033[1m==> %s\033[0m\n' "$*" >&2; }
info() { printf '    %s\n' "$*" >&2; }
fail() {
  printf '\n\033[1;31mdeploy failed:\033[0m %s\n' "$*" >&2
  exit 1
}

usage() {
  cat >&2 <<EOF
usage: sudo deploy/deploy.sh [options]

  --skip-verify   Do not run the test suite first. Only for a redeploy of a
                  tree that was already verified.
  --skip-nginx    Install and restart the service, leave the reverse proxy
                  alone. Use when Nginx lives on another host. Implies
                  --skip-certbot.
  --skip-certbot  Do not touch certificates. The Nginx configuration will
                  still fail to load without them.
  --staging       Issue from Let's Encrypt's staging CA. Untrusted by
                  browsers, but not rate limited — use it to rehearse.
  --force-renewal Renew even though the current certificate is still valid.
                  Rate limited by the CA; do not put this in a loop.
  -h, --help      This text.

Environment: APP_USER, APP_GROUP, APP_DIR, STATE_DIR, SERVICE_NAME, SITE_NAME,
CERT_DOMAINS, CERTBOT_EMAIL, WEBROOT.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-verify) SKIP_VERIFY=1 ;;
    --skip-nginx) SKIP_NGINX=1 ;;
    --skip-certbot) SKIP_CERTBOT=1 ;;
    --staging) CERTBOT_STAGING=1 ;;
    --force-renewal) FORCE_RENEWAL=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *) fail "unknown option: $1 (try --help)" ;;
  esac
  shift
done

# Certificates exist to be presented by the proxy. If the proxy is somebody
# else's problem on this host, so are they.
[ "$SKIP_NGINX" -eq 0 ] || SKIP_CERTBOT=1

# The lineage is named after the first domain: that is how certbot names the
# directory, and it is the path deploy/nginx.conf reads its key material from.
CERT_NAME="${CERT_DOMAINS%% *}"
CERT_DIR="/etc/letsencrypt/live/$CERT_NAME"

# --- preflight ---------------------------------------------------------------
# Everything that could stop the deployment is checked before the first change,
# so a missing tool is a message rather than a half-installed service.

step "Preflight"

[ "$(id -u)" -eq 0 ] || fail "run with sudo: installing units and writing $APP_DIR needs root"

for f in "$UNIT_SRC" "$REPO_ROOT/main.ts" "$REPO_ROOT/deno.json"; do
  [ -f "$f" ] || fail "missing $f — run this from a checkout of the repository"
done
[ "$SKIP_NGINX" -eq 1 ] || [ -f "$NGINX_SRC" ] || fail "missing $NGINX_SRC"

for cmd in rsync systemctl install; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is not installed"
done

# Deno is usually installed for a login user and absent from root's PATH; the
# unit names an absolute path, and so does this script.
DENO="${DENO:-$(command -v deno || true)}"
[ -n "$DENO" ] && [ -x "$DENO" ] || DENO=/usr/local/bin/deno
[ -x "$DENO" ] || fail "deno not found (set DENO=/path/to/deno)"
info "deno:    $DENO ($("$DENO" --version | head -n 1))"

# The unit file is the single source of truth for the port. Reading it back
# here means the health check below cannot drift away from what was installed.
APP_PORT="$(sed -n 's/^Environment=PORT=\([0-9]\+\).*/\1/p' "$UNIT_SRC" | tail -n 1)"
[ -n "$APP_PORT" ] || fail "no Environment=PORT= line in $UNIT_SRC"
info "source:  $REPO_ROOT"
info "target:  $APP_DIR (user $APP_USER, port $APP_PORT)"

if [ "$SKIP_NGINX" -eq 0 ] && ! command -v nginx >/dev/null 2>&1; then
  fail "nginx is not installed (pass --skip-nginx if it lives elsewhere)"
fi

if [ "$SKIP_CERTBOT" -eq 0 ]; then
  command -v certbot >/dev/null 2>&1 ||
    fail "certbot is not installed: sudo apt-get install -y certbot (or --skip-certbot)"

  # deploy/nginx.conf names its key material by absolute path. If that path and
  # the lineage this script is about to issue disagree, Nginx would load a
  # certificate nobody renews — so refuse now rather than discover it in ninety
  # days when the old one expires.
  conf_dir="$(sed -n 's|^[[:space:]]*ssl_certificate[[:space:]]\+\(/etc/letsencrypt/live/[^/]\+\)/.*|\1|p' \
    "$NGINX_SRC" | head -n 1)"
  if [ -n "$conf_dir" ] && [ "$conf_dir" != "$CERT_DIR" ]; then
    fail "nginx.conf reads $conf_dir but this deploy issues $CERT_DIR — set CERT_DOMAINS or SITE_NAME"
  fi

  case "$CERTBOT_EMAIL" in
    *@*.*) ;;
    *) fail "CERTBOT_EMAIL is not an address: '$CERTBOT_EMAIL' (expiry notices go there)" ;;
  esac
  info "certs:   $CERT_DOMAINS -> $CERT_DIR"
fi

# --- verify ------------------------------------------------------------------
# Formatting, lint, type check and the full suite, against the tree about to be
# copied. As the invoking user: root has no reason to own a module cache.

step "Verify"

if [ "$SKIP_VERIFY" -eq 1 ]; then
  info "skipped (--skip-verify)"
else
  if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != root ]; then
    sudo -u "$SUDO_USER" --preserve-env=HOME -- \
      sh -c "cd '$REPO_ROOT' && '$DENO' task verify" >&2 ||
      fail "the test suite did not pass — nothing was deployed"
  else
    (cd "$REPO_ROOT" && "$DENO" task verify) >&2 ||
      fail "the test suite did not pass — nothing was deployed"
  fi
  info "all checks passed"
fi

# --- account -----------------------------------------------------------------
# A system user with no shell and no home directory: there is nothing to log
# into and nothing to leave behind.

step "Account"

if id -u "$APP_USER" >/dev/null 2>&1; then
  info "user $APP_USER already exists"
else
  useradd --system --no-create-home --shell /usr/sbin/nologin "$APP_USER"
  info "created system user $APP_USER"
fi

# --- application ---------------------------------------------------------------
# Owned by root, so the service account cannot rewrite the code it runs. `var/`
# is a development inbox and never belongs on a server; `.git` is history the
# web tier has no use for.

step "Application"

install -d -m 0755 "$APP_DIR"
rsync -a --delete \
  --exclude '.git/' \
  --exclude '.github/' \
  --exclude 'var/' \
  --exclude 'tests/' \
  --exclude '*.swp' \
  "$REPO_ROOT/" "$APP_DIR/"
chown -R root:root "$APP_DIR"
info "synced $(du -sh "$APP_DIR" | cut -f1) to $APP_DIR"

install -d -o "$APP_USER" -g "$APP_GROUP" -m 0750 "$STATE_DIR"
info "state directory $STATE_DIR"

# --- module cache --------------------------------------------------------------
# Resolved once here, under review, so the unit can run --cached-only and the
# service never contacts a registry — not at start, not after a restart at 3am.

step "Module cache"

install -d -o "$APP_USER" -g "$APP_GROUP" -m 0750 "$STATE_DIR/deno-cache"
sudo -u "$APP_USER" DENO_DIR="$STATE_DIR/deno-cache" \
  "$DENO" cache "$APP_DIR/main.ts" >&2 ||
  fail "could not populate the module cache at $STATE_DIR/deno-cache"
info "cached into $STATE_DIR/deno-cache"

# --- service -------------------------------------------------------------------

step "Service"

install -m 0644 "$UNIT_SRC" "/etc/systemd/system/$SERVICE_NAME.service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME" >/dev/null 2>&1 || true

# restart, not reload: the unit is Type=exec and has no reload semantics.
systemctl restart "$SERVICE_NAME"
info "$SERVICE_NAME restarted"

# --- health --------------------------------------------------------------------
# The deployment is not finished when systemd returns; it is finished when the
# application answers. Fifteen tries at a fifth of a second is generous for a
# process whose entire startup is reading a directory.

step "Health"

probe() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 2 "http://127.0.0.1:$APP_PORT/healthz"
  else
    "$DENO" eval --allow-net=127.0.0.1 \
      "const r = await fetch('http://127.0.0.1:$APP_PORT/healthz');
       if (!r.ok) Deno.exit(1);
       console.log(await r.text());"
  fi
}

healthy=0
for _ in $(seq 1 15); do
  if body="$(probe 2>/dev/null)"; then
    healthy=1
    break
  fi
  sleep 0.2
done

if [ "$healthy" -eq 0 ]; then
  systemctl --no-pager --lines=20 status "$SERVICE_NAME" >&2 || true
  fail "no answer on 127.0.0.1:$APP_PORT/healthz — the service is not serving"
fi
info "127.0.0.1:$APP_PORT/healthz -> $body"

# --- certificates ----------------------------------------------------------------
# Before the reverse proxy, because deploy/nginx.conf names its key material by
# absolute path: `nginx -t` fails outright if the lineage is not on disk yet.
#
# The bootstrap is the chicken and egg of ACME. The certificate cannot be
# issued until the CA can reach http://$SITE_NAME/.well-known/acme-challenge/,
# and the real configuration cannot load until the certificate exists. So for a
# first issuance only, a plaintext server block that serves the challenge and
# nothing else goes up, and the real one replaces it a step later. A host that
# already has the lineage skips all of this: its live configuration already
# serves the challenge from the same webroot, and renewal needs no downtime.

# `nginx -t` first, always: a configuration that does not parse must never
# reach a running Nginx, and on a fresh host there is nothing to reload yet.
nginx_apply() {
  nginx -t >&2 || fail "nginx rejected the configuration; the running one was left alone"
  if systemctl is-active --quiet nginx; then
    systemctl reload nginx
  else
    systemctl enable --now nginx >/dev/null 2>&1 || systemctl start nginx
  fi
}

step "Certificates"

if [ "$SKIP_CERTBOT" -eq 1 ]; then
  info "skipped ($([ "$SKIP_NGINX" -eq 1 ] && echo --skip-nginx || echo --skip-certbot))"
else
  # The webroot is world-readable and holds nothing but challenge tokens, which
  # are public by design and deleted as soon as they are answered.
  install -d -m 0755 "$WEBROOT"

  certbot_args=(certonly --webroot -w "$WEBROOT" --cert-name "$CERT_NAME"
    --non-interactive --agree-tos -m "$CERTBOT_EMAIL")
  for domain in $CERT_DOMAINS; do certbot_args+=(-d "$domain"); done
  [ "$CERTBOT_STAGING" -eq 0 ] || certbot_args+=(--staging)
  if [ "$FORCE_RENEWAL" -eq 1 ]; then
    certbot_args+=(--force-renewal)
  else
    # Idempotence: a certificate with more than 30 days left is left alone.
    certbot_args+=(--keep-until-expiring)
  fi

  if [ ! -s "$CERT_DIR/fullchain.pem" ]; then
    info "no lineage at $CERT_DIR — bootstrapping over plaintext"

    # Only the challenge, and a redirect for everything else. This is the same
    # port 80 block the real configuration ends with, minus everything that
    # depends on a certificate.
    cat >"/etc/nginx/sites-available/$SITE_NAME" <<EOF
# Temporary: written by deploy/deploy.sh for the first ACME challenge only.
# Replaced by deploy/nginx.conf as soon as the certificate exists.
server {
    listen 80;
    listen [::]:80;
    server_name ${CERT_DOMAINS};

    location /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }

    location / {
        return 503;
    }
}
EOF
    ln -sfn "/etc/nginx/sites-available/$SITE_NAME" "/etc/nginx/sites-enabled/$SITE_NAME"
    nginx_apply
  else
    expiry="$(openssl x509 -enddate -noout -in "$CERT_DIR/fullchain.pem" 2>/dev/null | cut -d= -f2)"
    info "lineage exists${expiry:+, expires $expiry}"
  fi

  certbot "${certbot_args[@]}" >&2 ||
    fail "certbot could not issue for $CERT_DOMAINS — check that DNS points here and 80/tcp is open"

  [ -s "$CERT_DIR/fullchain.pem" ] ||
    fail "certbot reported success but $CERT_DIR/fullchain.pem is not there"
  info "certificate in place at $CERT_DIR"

  # Renewal runs unattended from certbot's own timer. Nginx keeps the old
  # certificate in memory until told otherwise, so the reload is the half of
  # renewal that is this deployment's responsibility.
  install -d -m 0755 /etc/letsencrypt/renewal-hooks/deploy
  cat >/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'EOF'
#!/bin/sh
# Written by deploy/deploy.sh. Certbot renews the file; Nginx has to be told to
# read it again, or it serves the expired one it already has in memory.
set -eu
nginx -t && systemctl reload nginx
EOF
  chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

  if systemctl list-unit-files certbot.timer >/dev/null 2>&1; then
    systemctl enable --now certbot.timer >/dev/null 2>&1 || true
    info "renewal: certbot.timer, reload hook installed"
  else
    info "renewal: no certbot.timer on this host — schedule 'certbot renew' yourself"
  fi
fi

# --- reverse proxy ---------------------------------------------------------------
# Last, and only once the application behind it is known to answer and the key
# material it points at is on disk.

step "Reverse proxy"

if [ "$SKIP_NGINX" -eq 1 ]; then
  info "skipped (--skip-nginx)"
else
  install -m 0644 "$NGINX_SRC" "/etc/nginx/sites-available/$SITE_NAME"
  ln -sfn "/etc/nginx/sites-available/$SITE_NAME" "/etc/nginx/sites-enabled/$SITE_NAME"
  nginx_apply
  info "nginx serving $SITE_NAME"
fi

step "Deployed"
info "journalctl -u $SERVICE_NAME -f --output cat | jq ."
info "sudo -u $APP_USER tail -f $STATE_DIR/inbox.jsonl | jq ."
