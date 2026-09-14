#!/usr/bin/env bash
#
# leak-gate.sh — confidentiality gate for the public STRATUM repository.
#
# This repo is published. Anything committed here is immediately public and stays
# in history even after it is deleted, so the check has to run before the commit
# lands, not afterwards. `scripts/oss/leak-gate.sh` is run by CI for that reason.
#
# It is a deliberate copy of the gate in the private source repository, minus the
# two checks that name the real production identifiers: writing the live Supabase
# project ref into this repo in order to scan for it would defeat the purpose.
# Those checks stay private; this one scans for the general shapes.
#
# Usage: scripts/oss/leak-gate.sh [--tracked] [directory]
#   --tracked   Scan only tracked files (what would actually be published) using
#               git ls-files, instead of walking the working tree. Preferred in
#               CI and before a commit: it cannot be tripped by gitignored local
#               files such as apps/web/.env.
# Exit: 0 clean, 1 findings, 2 usage error

set -uo pipefail

TRACKED_MODE=0
TARGET=""
for arg in "$@"; do
  case "$arg" in
    --tracked) TRACKED_MODE=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) TARGET="$arg" ;;
  esac
done
TARGET="${TARGET:-.}"

if [ ! -d "$TARGET" ]; then
  echo "ERROR: not a directory: $TARGET" >&2
  exit 2
fi

TARGET="$(cd "$TARGET" && pwd)"
FAIL=0

red()   { printf '\033[31m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
bold()  { printf '\033[1m%s\033[0m\n' "$1"; }

bold "Leak gate: $TARGET  (mode: $([ "$TRACKED_MODE" -eq 1 ] && echo tracked || echo working-tree))"
echo

# Directories that are never committed, so scanning them produces false failures
# (e.g. Vite's dist/stats.html embeds an absolute build path).
SKIP_DIRS=(--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist
           --exclude-dir=build --exclude-dir=.vite --exclude-dir=coverage
           --exclude-dir=__pycache__ --exclude-dir=.pytest_cache
           --exclude-dir=playwright-report --exclude-dir=test-results)
SKIP_FIND=(-not -path '*/.git/*' -not -path '*/node_modules/*' -not -path '*/dist/*'
           -not -path '*/build/*' -not -path '*/.vite/*' -not -path '*/coverage/*'
           -not -path '*/__pycache__/*' -not -path '*/.pytest_cache/*')

# scan <label> <pattern> [benign-line-regex]
#
# The optional third argument drops known-benign matches, such as obviously fake
# credentials inside security test fixtures. A gate that cries wolf gets bypassed,
# so every exemption must be explicit and narrow.
scan() {
  local label="$1" pattern="$2" benign="${3:-}"
  local hits
  if [ "$TRACKED_MODE" -eq 1 ]; then
    local files
    files="$(git -C "$TARGET" ls-files 2>/dev/null || true)"
    [ -z "$files" ] && { green "ok    $label (no tracked files)"; return; }
    hits="$(printf '%s\n' "$files" | tr '\n' '\0' \
            | xargs -0 grep -InE "$pattern" 2>/dev/null || true)"
  else
    hits="$(grep -rInE "$pattern" "$TARGET" "${SKIP_DIRS[@]}" 2>/dev/null || true)"
  fi
  if [ -n "$benign" ] && [ -n "$hits" ]; then
    hits="$(printf '%s\n' "$hits" | grep -vE "$benign" || true)"
  fi
  hits="$(printf '%s\n' "$hits" | grep -v '^$' | head -25 || true)"
  if [ -n "$hits" ]; then
    red "FAIL  $label"
    printf '%s\n' "$hits" | sed 's/^/      /'
    echo
    FAIL=1
  else
    green "ok    $label"
  fi
}

# ---------------------------------------------------------------- machine state
# A real absolute path from the author's machine leaks a username and directory
# layout, and is a broken instruction for everyone else. Placeholder paths in
# documentation (`/Users/.../ms-playwright`) are explicitly not matches: they are
# generic advice, not somebody's home directory.
scan "absolute machine paths"   '/(Users|Volumes|home)/[A-Za-z0-9._-]+/' \
                                '/Users/\.\.\.'

# ---------------------------------------------------------------- credentials
# Fake values inside security tests are expected; exempt them by file, narrowly.
scan "private key material"     'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' \
                                'test_push_notifications_unit'
# XXXXXXXXXX is a placeholder in the env templates, not a real key id.
scan "Apple key file names"     'AuthKey_[A-Z0-9]{10}' 'AuthKey_XXXXXXXXXX'
scan "Stripe secret keys"       'sk_(live|test)_[A-Za-z0-9]{10,}'
scan "Stripe webhook secrets"   'whsec_[A-Za-z0-9]{16,}' 'whsec_(test|configured)'
scan "Google API keys"          'AIza[0-9A-Za-z_-]{30,}' \
                                'test_prompt_injection_defense'
scan "GitHub tokens"            '(ghp|gho|ghs|ghr)_[A-Za-z0-9]{30,}'
scan "AWS access keys"          'AKIA[0-9A-Z]{16}'
scan "Slack tokens"             'xox[baprs]-[A-Za-z0-9-]{10,}'
# Any Supabase project reference, not just ours: a self-hoster copying this repo
# must not inherit somebody else's hosted project.
scan "hosted Supabase project"  '[a-z]{20}\.supabase\.co'

# ---------------------------------------------------------------- local-only files
# These are how local credentials normally leak: a real .env or key pair that was
# not covered by .gitignore, or was force-added.
echo
bold "Files that must never be tracked"
for pat in '*.p8' '*.p12' '*.pem' '*.mobileprovision' 'jwt_secret' \
           '.env' '.env.local' '.env.production' '.env.development' \
           '*.bak' '*.backup' '*.orig'; do
  found="$(git -C "$TARGET" ls-files -- "$pat" 2>/dev/null | head -10 || true)"
  if [ -n "$found" ]; then
    red "FAIL  tracked: $pat"
    printf '%s\n' "$found" | sed 's/^/      /'
    FAIL=1
  else
    green "ok    not tracked: $pat"
  fi
done

# ---------------------------------------------------------------- author identity
# Attribution belongs in README/LICENSE. A runtime string or a hardcoded support
# address routes other people's users to the author.
echo
bold "Author identity outside attribution"
scan "personal domain in code"  'chandlernguyen\.com' \
                                '^(LICENSE|README\.md):'
scan "Apple bundle id"          'com\.chandlernguyen'

# ---------------------------------------------------------------- prose claims
# The project publishes no metrics — positive or negative. A reference
# implementation does not need a traction story, and stating one creates either a
# credibility problem or a false claim. Restricted to prose we author, because
# words like "revenue" are legitimate product vocabulary in source and fixtures.
scan_md() {
  local label="$1" pattern="$2" hits
  if [ "$TRACKED_MODE" -eq 1 ]; then
    local files
    files="$(git -C "$TARGET" ls-files '*.md' 2>/dev/null || true)"
    [ -z "$files" ] && { green "ok    $label (no tracked markdown)"; return; }
    hits="$(printf '%s\n' "$files" | tr '\n' '\0' \
            | xargs -0 grep -InE "$pattern" 2>/dev/null || true)"
  else
    hits="$(grep -rInE "$pattern" "$TARGET" --include='*.md' "${SKIP_DIRS[@]}" 2>/dev/null || true)"
  fi
  hits="$(printf '%s\n' "$hits" | grep -v '^$' | head -25 || true)"
  if [ -n "$hits" ]; then
    red "FAIL  $label"
    printf '%s\n' "$hits" | sed 's/^/      /'
    echo
    FAIL=1
  else
    green "ok    $label"
  fi
}

scan_md "self-reported traction" \
  '\b(we|I|STRATUM) (have|has|had|got)\b[^.]{0,40}\b(users?|customers?|signups?)\b|\b(zero|no|0) (paying )?(users?|customers?|subscribers?)\b|\b(MRR|ARR|monthly recurring revenue|churn rate)\b'

# ---------------------------------------------------------------- result
echo
if [ "$FAIL" -ne 0 ]; then
  red "LEAK GATE FAILED — do not publish."
  exit 1
fi
green "LEAK GATE PASSED"
exit 0
