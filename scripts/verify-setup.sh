#!/usr/bin/env bash
#
# verify-setup.sh — check that this machine can run STRATUM, and report precisely
# what is missing when it cannot.
#
# Run it on its own before starting:
#
#   scripts/verify-setup.sh
#
# It only inspects; it never installs, starts or changes anything. scripts/bootstrap.sh
# calls it first, so a failed setup explains itself instead of surfacing three
# steps later as an unrelated-looking error.
#
# Exit: 0 everything present, 1 something missing, 2 usage error

set -uo pipefail

QUIET=0
for arg in "$@"; do
  case "$arg" in
    -q|--quiet) QUIET=1 ;;
    -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MISSING=0
WARNINGS=0

if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BOLD=$'\033[1m'; OFF=$'\033[0m'
else
  RED=""; GREEN=""; YELLOW=""; BOLD=""; OFF=""
fi

ok()   { [ "$QUIET" -eq 1 ] || printf '  %s✓%s %s\n' "$GREEN" "$OFF" "$1"; }
bad()  { printf '  %s✗%s %s\n' "$RED" "$OFF" "$1"; MISSING=$((MISSING+1)); }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$OFF" "$1"; WARNINGS=$((WARNINGS+1)); }

# need <label> <remediation> <command...>
# Runs `<command> --version` (the convention all six tools follow).
need() {
  local label="$1" remediation="$2" ; shift 2
  if ! command -v "$1" >/dev/null 2>&1; then
    bad "$label — not found"
    printf '      install: %s\n' "$remediation"
    return 1
  fi
  local version
  # DO_NOT_TRACK avoids the Supabase CLI's telemetry write, which can fail on a
  # machine where its state directory is not writable and would otherwise
  # suppress the version output entirely.
  version="$(DO_NOT_TRACK=1 "$@" 2>/dev/null | head -1)"
  ok "$label — ${version:-(version unknown)}"
}

[ "$QUIET" -eq 1 ] || { printf '%sChecking what this machine needs%s\n\n' "$BOLD" "$OFF"; }

# ---------------------------------------------------------------- required tools
need "Node.js (22 or newer)"  "https://nodejs.org — take the LTS installer"        node --version
need "npm"                    "ships with Node.js"                                 npm --version
need "Python (3.12 or newer)" "https://www.python.org/downloads/"                  python3 --version
need "Poetry"                 "https://python-poetry.org/docs/#installation"       poetry --version
need "Supabase CLI"           "https://supabase.com/docs/guides/cli/getting-started" supabase --version
need "Docker"                 "https://www.docker.com/products/docker-desktop/"    docker --version

# Version floors. Node in particular fails in a confusing way on 20.x.
if command -v node >/dev/null 2>&1; then
  major="$(node --version | sed 's/^v//' | cut -d. -f1)"
  [ "$major" -lt 22 ] 2>/dev/null && bad "Node.js is $(node --version); this project needs 22 or newer"
fi
if command -v python3 >/dev/null 2>&1; then
  minor="$(python3 --version | awk '{print $2}' | cut -d. -f2)"
  [ "$minor" -lt 12 ] 2>/dev/null && bad "Python is $(python3 --version); this project needs 3.12 or newer"
fi

# ---------------------------------------------------------------- docker daemon
# Docker being installed is not enough, and "installed but not running" is the
# single most common cause of a confusing failure two steps later.
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    ok "Docker daemon is running"
  else
    bad "Docker is installed but the daemon is not responding"
    printf '      start Docker Desktop and wait for it to finish starting, then re-run this script\n'
  fi
fi

# ---------------------------------------------------------------- repo state
[ "$QUIET" -eq 1 ] || printf '\n%sRepository%s\n\n' "$BOLD" "$OFF"

if [ -f "$REPO_ROOT/apps/api/.env" ]; then
  ok "apps/api/.env exists"
else
  warn "apps/api/.env is missing — scripts/bootstrap.sh will create it from the example"
fi

if [ -f "$REPO_ROOT/apps/web/.env" ]; then
  ok "apps/web/.env exists"
else
  warn "apps/web/.env is missing — Vite reads this at startup; the site renders blank without it"
fi

if [ -d "$REPO_ROOT/node_modules" ]; then
  ok "node_modules present"
else
  warn "node_modules is missing — run: npm install"
fi

# ---------------------------------------------------------------- port availability
# The 563xx range is deliberate (see supabase/config.toml). If something already
# holds one of these ports the failure is otherwise hard to attribute.
[ "$QUIET" -eq 1 ] || printf '\n%sPorts%s\n\n' "$BOLD" "$OFF"

port_free() {
  local port="$1" label="$2"
  if command -v lsof >/dev/null 2>&1; then
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      warn "port $port is in use ($label) — if this is not STRATUM already running, stop that process"
    else
      ok "port $port free ($label)"
    fi
  fi
}
port_free 56300 "API"
port_free 56310 "website"
port_free 56321 "Supabase API"

# ---------------------------------------------------------------- verdict
echo
if [ "$MISSING" -gt 0 ]; then
  printf '%s%s item(s) missing. Install them, then run this script again.%s\n' "$RED" "$MISSING" "$OFF"
  exit 1
fi
if [ "$WARNINGS" -gt 0 ]; then
  printf '%sAll required tools are present.%s %s warning(s) above are informational.\n' "$GREEN" "$OFF" "$WARNINGS"
  exit 0
fi
printf '%sAll required tools are present. Next: scripts/bootstrap.sh%s\n' "$GREEN" "$OFF"
exit 0
