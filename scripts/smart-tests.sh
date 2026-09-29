#!/bin/sh
# Helper for CloudBees Smart Tests steps, shared by the Unify and GitHub Actions
# workflows. Smart Tests must never break CI: if SMART_TESTS_TOKEN is unset or
# the service is unreachable, each command warns and carries on (subset falls
# back to running every candidate test).
#
#   smart-tests.sh start  <build-name> <test-suite>          record build + session
#   smart-tests.sh subset <target> <mode> <file>...          write the tests to run (mode: subset|observe|full)
#   smart-tests.sh record <junit.xml> <test-file>...         record test results
#
# Run from the repository root. State (session id, subset) lives in .smart-tests/.
set -eu

STATE=.smart-tests
SESSION="$STATE/session.txt"
mkdir -p "$STATE"

warn() { echo "WARNING: Smart Tests: $*" >&2; }

enabled() {
  if [ -z "${SMART_TESTS_TOKEN:-}" ]; then
    warn "SMART_TESTS_TOKEN is not set; skipping"
    return 1
  fi
}

# The CLI is a Python package that also needs a JVM and git. GitHub runners
# already have Java; the python:3.12-slim image used in Unify needs both.
install() {
  if ! command -v java >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq --no-install-recommends default-jre-headless git >/dev/null
  fi
  command -v smart-tests >/dev/null 2>&1 || pip install -q --disable-pip-version-check smart-tests-cli
  git config --global --add safe.directory "$PWD"
}

cmd=${1:-}
[ $# -gt 0 ] && shift

case "$cmd" in
  start)
    build=$1 suite=$2
    rm -f "$SESSION"
    enabled || exit 0
    install
    smart-tests verify || { warn "verify failed (check the token)"; exit 0; }
    # --source . reads the commit history, so the checkout must not be shallow.
    smart-tests record build --build "$build" --source . || { warn "record build failed"; exit 0; }
    smart-tests record session --build "$build" --test-suite "$suite" > "$SESSION" \
      || { warn "record session failed"; rm -f "$SESSION"; exit 0; }
    echo "Smart Tests session: $(cat "$SESSION")"
    ;;

  subset)
    target=$1 mode=$2; shift 2
    printf '%s\n' "$@" > "$STATE/candidates.txt"
    cp "$STATE/candidates.txt" "$STATE/subset.txt"
    if [ "$mode" != full ] && [ -s "$SESSION" ] && enabled; then
      install
      observe=""; [ "$mode" = observe ] && observe="--observation"
      # shellcheck disable=SC2086
      smart-tests subset file --session "@$SESSION" --target "$target" $observe \
        < "$STATE/candidates.txt" > "$STATE/subset.new" \
        && [ -s "$STATE/subset.new" ] && mv "$STATE/subset.new" "$STATE/subset.txt" \
        || warn "subset failed; running all tests"
    fi
    echo "Running $(wc -l < "$STATE/subset.txt") of $(wc -l < "$STATE/candidates.txt") test files (mode: $mode, target: $target):"
    cat "$STATE/subset.txt"
    ;;

  record)
    junit=$1; shift
    [ -s "$SESSION" ] || { warn "no session; skipping result upload"; exit 0; }
    [ -f "$junit" ] || { warn "$junit not found; skipping"; exit 0; }
    enabled || exit 0
    install
    # Node's --test-reporter=junit never writes a file="..." attribute at all
    # (only name/classname/time) -- it's not a matter of absolute vs relative
    # paths, the attribute is simply absent. Smart Tests requires one per
    # <testsuite> to attribute results to a source file, so inject it here.
    #
    # Node reports <testsuite> elements sorted alphabetically by describe()
    # name, NOT in the order files were given on the command line (verified:
    # `node --test validation.check.js dates.check.js shipping.check.js
    # cart.check.js` reports cart, dates, shipping, validation). Every suite
    # in this repo names its describe() after the file's base name, so
    # sorting the given file paths alphabetically reproduces that same
    # order, and each file has exactly one top-level describe() -- so a
    # sorted positional match is correct here, though it's specific to this
    # repo's convention, not a general solution.
    python3 - "$junit" "$STATE/junit.xml" "$@" <<'PY'
import sys
import xml.etree.ElementTree as ET

junit_in, junit_out, *files = sys.argv[1:]
files = sorted(files)
tree = ET.parse(junit_in)
suites = tree.getroot().findall("testsuite")
if len(suites) != len(files):
    print(f"WARNING: Smart Tests: {len(suites)} testsuite(s) but {len(files)} file(s) "
          "given; file attribution may be wrong", file=sys.stderr)
for suite, path in zip(suites, files):
    suite.set("file", path)
tree.write(junit_out, encoding="utf-8", xml_declaration=True)
PY
    smart-tests record tests file --session "@$SESSION" "$STATE/junit.xml" || warn "record tests failed"
    ;;

  *)
    echo "usage: $0 start|subset|record ..." >&2
    exit 2
    ;;
esac
