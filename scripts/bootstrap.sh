#!/usr/bin/env bash
#
# bootstrap.sh — get STRATUM running locally with one command.
#
#   scripts/bootstrap.sh
#
# It checks the tools you need, installs dependencies, creates the two settings
# files if they are missing, starts the database, loads the demo data, then starts
# the API and the website and waits until both answer.
#
# It is safe to run again: it will not overwrite an existing .env, and it notices
# when something is already running.
#
# Requires Docker Desktop to be open and running. No AI key is needed — the app
# starts in DEMO_MODE, where the agents return clearly-labelled canned output
# rather than calling a model. Nothing leaves your machine and nothing costs
# money.
#
# To stop everything afterwards: scripts/stop.sh

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

RUN_DIR="$REPO_ROOT/.run"
API_LOG="$RUN_DIR/api.log"
WEB_LOG="$RUN_DIR/web.log"
API_PORT=56300
WEB_PORT=56310

if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BOLD=$'\033[1m'; OFF=$'\033[0m'
else
  RED=""; GREEN=""; YELLOW=""; BOLD=""; OFF=""
fi
step() { printf '\n%s==> %s%s\n' "$BOLD" "$1" "$OFF"; }
ok()   { printf '    %s✓%s %s\n' "$GREEN" "$OFF" "$1"; }
die()  { printf '\n%s%s%s\n' "$RED" "$1" "$OFF" >&2; exit 1; }

port_in_use() {
  command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

# ---------------------------------------------------------------- 1. prerequisites
step "Checking what this machine needs"
if ! bash scripts/verify-setup.sh; then
  die "Missing prerequisites. Install what is listed above, then run this script again."
fi

# ---------------------------------------------------------------- 2. conflicts
step "Checking for conflicts"
# A half-running stack gives confusing symptoms later, so stop here instead.
for spec in "$API_PORT:API" "$WEB_PORT:website"; do
  port="${spec%%:*}"; label="${spec##*:}"
  if port_in_use "$port" && [ ! -f "$RUN_DIR/$label.pid" ]; then
    die "Port $port ($label) is already in use by something this script did not start.
    Stop it, or run scripts/stop.sh if STRATUM is already running, then try again."
  fi
done
ok "no conflicting processes"

# ---------------------------------------------------------------- 3. dependencies
step "Installing dependencies"
if [ ! -d node_modules ]; then
  npm install || die "npm install failed. Scroll up for the first error."
  ok "JavaScript packages installed"
else
  ok "JavaScript packages already installed"
fi
if ! poetry env info --path >/dev/null 2>&1; then
  poetry install || die "poetry install failed. Scroll up for the first error."
  ok "Python packages installed"
else
  ok "Python packages already installed"
fi

# ---------------------------------------------------------------- 4. settings files
step "Creating settings files"
if [ -f apps/api/.env ]; then
  ok "apps/api/.env already exists (left untouched)"
else
  cp apps/api/.env.example apps/api/.env || die "Could not create apps/api/.env"
  # Replace the template's known placeholder with a generated secret: every
  # deployment that copied the template verbatim would otherwise share it.
  if command -v openssl >/dev/null 2>&1; then
    secret="$(openssl rand -hex 32)"
    tmp="$(mktemp)"
    awk -v s="$secret" '/^PUSH_DISPATCH_SECRET=/{ print "PUSH_DISPATCH_SECRET=\"" s "\""; next } { print }' \
      apps/api/.env > "$tmp" && mv "$tmp" apps/api/.env
  else
    printf '    note: openssl not found; set PUSH_DISPATCH_SECRET in apps/api/.env before exposing the API\n'
  fi
  ok "apps/api/.env created from the template — DEMO_MODE is on, so no AI key is needed"
fi
if [ -f apps/web/.env ]; then
  ok "apps/web/.env already exists (left untouched)"
else
  cp apps/web/.env.example apps/web/.env || die "Could not create apps/web/.env"
  ok "apps/web/.env created (Vite reads this at startup, so it must exist first)"
fi

mkdir -p "$RUN_DIR"

# ---------------------------------------------------------------- 5. database
step "Starting the database"
# DO_NOT_TRACK keeps the CLI from writing telemetry, which fails on a machine
# where ~/.supabase is not writable and obscures the real error.
# First run downloads several hundred megabytes of container images.
DO_NOT_TRACK=1 supabase start || die "supabase start failed. Is Docker Desktop running?"
ok "Supabase is up"

step "Loading the schema and demo data"
DO_NOT_TRACK=1 supabase db reset >/dev/null 2>&1 || die "supabase db reset failed. Run it directly to see why."
ok "database ready (13 organisations, 27 test accounts)"

# ---------------------------------------------------------------- 6. API
step "Starting the API"
if port_in_use "$API_PORT"; then
  ok "API already running on $API_PORT"
else
  # DEMO_MODE comes from apps/api/.env, which main.py loads by explicit path.
  #
  # The rate limit is overridden here rather than left to the .env default. The
  # default exists to protect a real deployment and is deliberately kept in the
  # template, but it is 10 AI requests per minute per user: enough to explore,
  # too low to run the integration suite, which would then fail with a cascade
  # of 429s that look like application errors. This is a local development
  # server, so the limit is lifted for it.
  nohup env AI_RATE_LIMIT_ENABLED=false \
    poetry run uvicorn apps.api.main:app --host 127.0.0.1 --port "$API_PORT" \
    >"$API_LOG" 2>&1 &
  echo $! > "$RUN_DIR/API.pid"
  for _ in $(seq 1 40); do
    curl -sf "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null 2>&1 && break
    sleep 1
  done
  if curl -sf "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null 2>&1; then
    ok "API responding on http://127.0.0.1:$API_PORT"
  else
    printf '    %sAPI did not respond.%s Last lines of %s:\n' "$RED" "$OFF" "$API_LOG"
    tail -15 "$API_LOG" | sed 's/^/      /'
    die "Startup failed."
  fi
fi

# ---------------------------------------------------------------- 7. website
step "Starting the website"
if port_in_use "$WEB_PORT"; then
  ok "website already running on $WEB_PORT"
else
  nohup npm run dev --prefix apps/web -- --host 127.0.0.1 >"$WEB_LOG" 2>&1 &
  echo $! > "$RUN_DIR/website.pid"
  for _ in $(seq 1 60); do
    curl -sf "http://127.0.0.1:$WEB_PORT/" >/dev/null 2>&1 && break
    sleep 1
  done
  if curl -sf "http://127.0.0.1:$WEB_PORT/" >/dev/null 2>&1; then
    ok "website responding on http://127.0.0.1:$WEB_PORT"
  else
    printf '    %sWebsite did not respond.%s Last lines of %s:\n' "$RED" "$OFF" "$WEB_LOG"
    tail -15 "$WEB_LOG" | sed 's/^/      /'
    die "Startup failed."
  fi
fi

# ---------------------------------------------------------------- done
cat <<EOF

${GREEN}STRATUM is running.${OFF}

  Website   http://127.0.0.1:$WEB_PORT
  API       http://127.0.0.1:$API_PORT/api/v1/health
  Database  http://127.0.0.1:56323  (Supabase Studio)

  Sign in with either of these — the password is LocalDevOnly123! for both:

    sme.owner@example.com      a small business
    agency.owner@example.com   an agency managing clients

The agents return canned output in DEMO_MODE. To use a real model instead, set
DEMO_MODE="false" and GOOGLE_API_KEY in apps/api/.env, then restart the API.

Logs:  $API_LOG
       $WEB_LOG

To stop everything:  scripts/stop.sh
EOF
