#!/bin/sh
# Helper for CloudBees Smart Tests steps, shared by the Unify and GitHub Actions
# workflows. Smart Tests must never break CI: if SMART_TESTS_TOKEN is unset or
# the service is unreachable, each command warns and carries on (subset falls
# back to running every candidate test).
#
#   smart-tests.sh start  <build-name> <test-suite>     record build + session
#   smart-tests.sh subset <value> <mode> <file>...      write the files to run to .smart-tests/subset.txt
#   smart-tests.sh record <junit.xml> <test-file>...    record test results
#
# Modes (the subset <mode> argument; `start` reads SMART_TESTS_MODE):
#   subset   run only the files Smart Tests selects.
#   observe  run and record every file. The session is created with
#            --observation, and the files Smart Tests would have selected are
#            saved to .smart-tests/would-have-run.txt and printed next to the
#            source files the build changed. Use this while the model trains:
#            in subset mode, files that aren't selected never get new results.
#   full     run and record every file without asking for a selection.
#
# Optional environment:
#   SMART_TESTS_OPTIMIZATION   target (default) | time | confidence: how <value>
#                              is passed, e.g. --target 40% (share of expected
#                              duration), --time 5 (seconds), --confidence 90%.
#   SMART_TESTS_PRIORITIZE_CHANGED=true
#                              always select the tests of each changed module
#                              (<src dir>/<name>.* -> <name>.* test file), via
#                              Smart Tests' --prioritized-tests-mapping plus a
#                              local union in case the service doesn't apply it.
#   SMART_TESTS_USE_CASE       one-commit | feature-branch | recurring: which
#                              changes Smart Tests compares the tests against
#                              (subset --use-case, a hidden CLI option). Unset
#                              leaves it to the service.
#   SMART_TESTS_SRC_DIR        modules to map to tests (default smart-tests-demo/src).
#   SMART_TESTS_BASE_BRANCH    changes are listed against the merge-base with
#                              origin/<this> (default main); on that branch
#                              itself, against the previous commit.
#
# Run from the repository root. State (session id, subset, logs) lives in .smart-tests/.
set -eu

STATE=.smart-tests
SESSION="$STATE/session.txt"
SRC_DIR=${SMART_TESTS_SRC_DIR:-smart-tests-demo/src}
BASE_BRANCH=${SMART_TESTS_BASE_BRANCH:-main}
mkdir -p "$STATE"

warn() { echo "WARNING: Smart Tests: $*" >&2; }

enabled() {
  if [ -z "${SMART_TESTS_TOKEN:-}" ]; then
    warn "SMART_TESTS_TOKEN is not set; skipping"
    return 1
  fi
}

# The CLI is a Python package that also needs a JVM and git. GitHub runners
# already have Java; the python:3.13-slim image used in Unify needs both.
install() {
  if ! command -v java >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq --no-install-recommends default-jre-headless git >/dev/null
  fi
  command -v smart-tests >/dev/null 2>&1 || pip install -q --disable-pip-version-check smart-tests-cli
  git config --global --add safe.directory "$PWD"
}

# Writes the files under $SRC_DIR that this build changes to changed-src.txt.
# This is for the logs and the changed-module rule: Smart Tests itself works
# out what changed from the commits it collected in `record build`.
changed_src() {
  : > "$STATE/changed-src.txt"
  git rev-parse -q --verify "refs/remotes/origin/$BASE_BRANCH" >/dev/null \
    || GIT_TERMINAL_PROMPT=0 git fetch -q origin "+refs/heads/$BASE_BRANCH:refs/remotes/origin/$BASE_BRANCH" 2>/dev/null \
    || { warn "can't fetch origin/$BASE_BRANCH; changed files unknown"; return 0; }
  base=$(git merge-base HEAD "origin/$BASE_BRANCH" 2>/dev/null) \
    || { warn "no merge-base with origin/$BASE_BRANCH; changed files unknown"; return 0; }
  if [ "$base" = "$(git rev-parse HEAD)" ]; then
    base=$(git rev-parse -q --verify 'HEAD^' 2>/dev/null) || return 0
  fi
  git diff --name-only "$base" HEAD -- "$SRC_DIR" > "$STATE/changed-src.txt" || true
}

# Prints the candidate test files for each changed module: <src>/<name>.js -> .../<name>.check.js
suites_for_changed() {
  while read -r path; do
    name=$(basename "$path")
    name=${name%%.*}
    grep -E "(^|/)$name\\." "$STATE/candidates.txt" || true
  done < "$STATE/changed-src.txt" | sort -u
}

# Maps every module in $SRC_DIR to its test file(s), in Smart Tests' format.
# The service decides which mappings apply from what changed in the build.
write_mapping() {
  python3 - "$SRC_DIR" "$STATE/candidates.txt" > "$STATE/test-mapping.json" <<'PY'
import glob, json, os, sys

src_dir, candidates = sys.argv[1:]
mappings = {}
for path in open(candidates).read().split():
    name = os.path.basename(path).split(".")[0]
    for module in sorted(glob.glob(f"{src_dir}/{name}.*")):
        mappings.setdefault(module, []).append(f"file={path}")
# "." is the repository name `record build --source .` registers.
json.dump({"format": "prioritized-tests-v1", "mappings": {".": mappings}}, sys.stdout, indent=2)
PY
}

# Prints Smart Tests' ranking for subset $1 and writes the files it selected to $2.
inspect_subset() {
  smart-tests inspect subset --subset-id "$1" --json > "$STATE/inspect.json" || return 1
  python3 - "$STATE/inspect.json" "$2" <<'PY'
import json, sys

data = json.load(open(sys.argv[1]))
if not data.get("subset") and not data.get("rest"):
    sys.exit(1)
path = lambda t: t["test_path"].split("file=", 1)[-1]
print("Smart Tests ranking (most likely to fail first):")
print(f"  {'#':>2}  {'subset':6}  {'density':>8}  {'est.':>6}  file")
tests = [(t, True) for t in data["subset"]] + [(t, False) for t in data["rest"]]
for rank, (t, selected) in enumerate(tests, 1):
    print(f"  {rank:>2}  {'yes' if selected else '':6}  {t['density']:>8.4f}  "
          f"{t['estimated_duration_sec']:>5.2f}s  {path(t)}")
with open(sys.argv[2], "w") as out:
    out.writelines(path(t) + "\n" for t in data["subset"])
PY
}

# Writes $2: the selection in $1, plus the changed-module files first when
# SMART_TESTS_PRIORITIZE_CHANGED=true, and logs why each file is in it.
explain_selection() {
  : > "$STATE/rule.txt"
  [ "${SMART_TESTS_PRIORITIZE_CHANGED:-false}" = true ] && suites_for_changed > "$STATE/rule.txt"
  { cat "$STATE/rule.txt"; grep -vxF -f "$STATE/rule.txt" "$1" || true; } > "$2"
  while read -r f; do
    if ! grep -qxF "$f" "$STATE/rule.txt"; then
      why="Smart Tests"
    elif grep -qxF "$f" "$1"; then
      why="changed-module rule (also in Smart Tests' subset)"
    else
      why="changed-module rule (added to Smart Tests' subset)"
    fi
    echo "  $f  <- $why"
  done < "$2"
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
    observation=""; [ "${SMART_TESTS_MODE:-}" = observe ] && observation="--observation"
    # shellcheck disable=SC2086
    smart-tests record session --build "$build" --test-suite "$suite" $observation > "$SESSION" \
      || { warn "record session failed"; rm -f "$SESSION"; exit 0; }
    echo "Smart Tests session: $(cat "$SESSION")${observation:+ (observation mode)}"
    ;;

  subset)
    value=$1 mode=$2; shift 2
    optimization=${SMART_TESTS_OPTIMIZATION:-target}
    case "$optimization" in
      target|time|confidence) ;;
      *) warn "unknown SMART_TESTS_OPTIMIZATION '$optimization'; using target"; optimization=target ;;
    esac
    use_case=""
    case "${SMART_TESTS_USE_CASE:-}" in
      "") ;;
      one-commit|feature-branch|recurring) use_case="--use-case $SMART_TESTS_USE_CASE" ;;
      *) warn "unknown SMART_TESTS_USE_CASE '$SMART_TESTS_USE_CASE'; leaving it to the service" ;;
    esac
    printf '%s\n' "$@" > "$STATE/candidates.txt"
    cp "$STATE/candidates.txt" "$STATE/subset.txt"
    rm -f "$STATE/would-have-run.txt" "$STATE/selected.txt" "$STATE/subset.new" "$STATE/subset.err"
    total=$(wc -l < "$STATE/candidates.txt")

    if [ "$mode" = full ]; then
      echo "mode: full — selection skipped"
    elif [ -s "$SESSION" ] && enabled; then
      install
      changed_src
      echo "Changed $SRC_DIR files (vs origin/$BASE_BRANCH merge-base):"
      if [ -s "$STATE/changed-src.txt" ]; then sed 's/^/  /' "$STATE/changed-src.txt"; else echo "  (none)"; fi

      mapping=""
      if [ "${SMART_TESTS_PRIORITIZE_CHANGED:-false}" = true ]; then
        if write_mapping; then
          mapping="--prioritized-tests-mapping $STATE/test-mapping.json"
        else
          warn "couldn't write the test mapping; using the local changed-module rule only"
        fi
      fi

      status=0
      [ -n "$use_case" ] && echo "Change under test: ${use_case#--use-case }"
      # shellcheck disable=SC2086
      smart-tests subset file --session "@$SESSION" "--$optimization" "$value" $mapping $use_case \
        < "$STATE/candidates.txt" > "$STATE/subset.new" 2> "$STATE/subset.err" || status=$?
      cat "$STATE/subset.err" >&2
      subset_id=$(sed -n 's/.*created subset \([0-9][0-9]*\).*/\1/p' "$STATE/subset.err" | head -n 1)

      if [ "$status" -ne 0 ] || [ ! -s "$STATE/subset.new" ]; then
        warn "subset failed; running all tests"
      else
        # In an observation session the CLI prints every candidate (selection
        # first, then the rest), so the selection itself comes from `inspect`.
        inspected=false
        if [ -n "$subset_id" ] && inspect_subset "$subset_id" "$STATE/inspected.txt"; then
          inspected=true
        else
          warn "couldn't inspect subset ${subset_id:-(no id)}; ranking unavailable"
        fi
        if [ "$mode" = observe ]; then
          if $inspected; then
            cp "$STATE/inspected.txt" "$STATE/selected.txt"
          elif [ "$(wc -l < "$STATE/subset.new")" -lt "$total" ]; then
            # The session wasn't in observation mode, so the output is the selection.
            cp "$STATE/subset.new" "$STATE/selected.txt"
          fi
        else
          cp "$STATE/subset.new" "$STATE/selected.txt"
        fi

        if [ ! -s "$STATE/selected.txt" ]; then
          warn "the selection Smart Tests would have made is unknown"
        elif [ "$mode" = observe ]; then
          explain_selection "$STATE/selected.txt" "$STATE/would-have-run.txt" > "$STATE/why.txt"
          echo "Smart Tests would have run $(wc -l < "$STATE/would-have-run.txt") of $total test files (--$optimization $value):"
          cat "$STATE/why.txt"
        else
          explain_selection "$STATE/selected.txt" "$STATE/subset.txt" > "$STATE/why.txt"
          echo "Selected $(wc -l < "$STATE/subset.txt") of $total test files (--$optimization $value):"
          cat "$STATE/why.txt"
        fi
      fi
    fi
    echo "Running $(wc -l < "$STATE/subset.txt") of $total test files (mode: $mode, --$optimization $value):"
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
    #
    # The suite is also renamed to its file path: the CLI then records
    # file=<path>#testcase=<name> instead of file=<path>#testsuite=<describe>#testcase=<name>,
    # the shape Smart Tests expects when it subsets by file.
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
    suite.set("name", path)
tree.write(junit_out, encoding="utf-8", xml_declaration=True)
PY
    smart-tests record tests file --session "@$SESSION" "$STATE/junit.xml" || warn "record tests failed"
    ;;

  *)
    echo "usage: $0 start|subset|record ..." >&2
    exit 2
    ;;
esac
