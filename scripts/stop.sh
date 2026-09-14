#!/usr/bin/env bash
#
# stop.sh — stop the API and website started by scripts/bootstrap.sh.
#
#   scripts/stop.sh              stop the API and website (leaves the database up)
#   scripts/stop.sh --database   also stop the Supabase containers
#
# The database is left running by default because starting it again is the slowest
# part of the setup. Add --database when you are finished for the day.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
RUN_DIR="$REPO_ROOT/.run"

STOP_DATABASE=0
for arg in "$@"; do
  case "$arg" in
    --database) STOP_DATABASE=1 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [ -t 1 ]; then GREEN=$'\033[32m'; YELLOW=$'\033[33m'; OFF=$'\033[0m'; else GREEN=""; YELLOW=""; OFF=""; fi
ok()   { printf '  %s✓%s %s\n' "$GREEN" "$OFF" "$1"; }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$OFF" "$1"; }

# stop_one <pidfile> <label> <port>
stop_one() {
  local pidfile="$1" label="$2" port="$3" pid
  if [ -f "$pidfile" ]; then
    pid="$(cat "$pidfile" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      # Give it a moment to exit cleanly before insisting.
      for _ in $(seq 1 10); do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.5
      done
      kill -9 "$pid" 2>/dev/null
      ok "stopped $label (pid $pid)"
    else
      ok "$label was not running"
    fi
    rm -f "$pidfile"
  else
    ok "$label was not started by bootstrap.sh"
  fi

  # A child process can outlive its parent (npm and uvicorn both fork), so make
  # sure the port is actually free rather than trusting the pid.
  if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    local holder
    holder="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -1)"
    if [ -n "$holder" ]; then
      kill "$holder" 2>/dev/null
      ok "released port $port (killed pid $holder)"
    fi
  fi
}

stop_one "$RUN_DIR/API.pid" "API" 56300
stop_one "$RUN_DIR/website.pid" "website" 56310

if [ "$STOP_DATABASE" -eq 1 ]; then
  if command -v supabase >/dev/null 2>&1; then
    DO_NOT_TRACK=1 supabase stop >/dev/null 2>&1 && ok "Supabase containers stopped" || warn "Supabase was not running"
  fi
else
  warn "the database is still running — add --database to stop it too"
fi
