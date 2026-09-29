# Smart Tests demo suite

A small, self-contained e-commerce library (`src/`) with ~50 tests (`suites/*.check.js`),
used to demonstrate **CloudBees Smart Tests** in `.cloudbees/workflows/smart-tests-demo.yaml`.
It isn't part of the app and isn't shipped in the Docker image.

- Tests are named `*.check.js`, so the app's own `npm test` (`node --test`) doesn't pick them up.
- Each test simulates work so suites have realistic, differing durations;
  `orders` is the slow "integration" suite (~27% of the total on its own).
- `inventory` › *handles concurrent reservations (flaky)* fails about 70% of runs on purpose,
  so Smart Tests has a flaky test to flag. `SMART_TESTS_DEMO_FLAKY_RATE=0` disables it
  (the workflow does this by default while the model trains).
- `SMART_TESTS_DEMO_BREAK=tax,cart` makes every test in those suites fail, as if a change
  broke them.

Run locally:

```sh
node --test --test-concurrency=1 smart-tests-demo/suites/*.check.js
```

## Workflow settings

All set in the `env:` block of the workflow; `scripts/smart-tests.sh` documents them in full.

| Variable | Values | Effect |
|---|---|---|
| `SMART_TESTS_MODE` | `observe` (default), `subset`, `full` | `observe` runs and records every suite, and logs what Smart Tests *would* have run next to the `src/` files the branch changed. `subset` runs only the selection. `full` skips selection. |
| `SMART_TESTS_OPTIMIZATION` | `target` (default), `time`, `confidence` | How `SMART_TESTS_TARGET` is passed: `--target 40%` (share of expected duration, so roughly the same count every time), `--time 5` (seconds), `--confidence 90%` (the count varies with how risky the change looks). |
| `SMART_TESTS_PRIORITIZE_CHANGED` | `true` / `false` | Always select `suites/<name>.check.js` when `src/<name>.js` changes, on top of the model's choice. Uses Smart Tests' `--prioritized-tests-mapping` plus a local union; the log marks each file as chosen by the rule or by Smart Tests. |
| `SMART_TESTS_DEMO_FLAKY_RATE` | `0`–`1` | Failure rate of the flaky inventory test. |
| `SMART_TESTS_DEMO_BREAK` | suite names | Suites to fail on purpose. |

In observe mode, look for these lines in the *record build/session and select tests* step:
`Changed smart-tests-demo/src files`, `Smart Tests ranking`, and `Smart Tests would have run`.

## Why the selection can look fixed

Smart Tests learns which tests fail after which changes. Until it has seen failures follow
changes, it ranks tests on generic signals (recent failures, flakiness, duration), so a
change to `tax.js` does not by itself pull in `tax.check.js`. Two more things keep the
selection stable:

- In `subset` mode, only the selected suites run, so the others never get new results.
  Train in `observe` mode.
- Smart Tests looks at what changed since the previous build it recorded, not since `main`.
  A commit that only touches the workflow is "a workflow change" to Smart Tests, even if
  earlier commits on the branch changed `tax.js`.

`SMART_TESTS_PRIORITIZE_CHANGED=true` gives a predictable demo in the meantime.

## Training plan

About 20 runs in `observe` mode, with `SMART_TESTS_DEMO_FLAKY_RATE: "0"`. Each step is one
push to a PR branch (or one merge to `main`). Break with a real source change where you can,
since that is exactly the signal Smart Tests learns from; `SMART_TESTS_DEMO_BREAK` is the
shortcut when you don't want to think up a bug.

| Runs | Change | Expected |
|---|---|---|
| 1–3 | Harmless edits to `README.md` / comments | All pass (baseline) |
| 4 | Break `src/tax.js` (e.g. change the `US-CA` rate) | `tax` fails |
| 5 | Fix `src/tax.js` | All pass |
| 6 | Break `src/cart.js` (e.g. off-by-one in `itemCount`) | `cart` fails |
| 7 | Fix `src/cart.js` | All pass |
| 8 | Break `src/shipping.js` | `shipping` fails |
| 9 | Fix `src/shipping.js` | All pass |
| 10–15 | Repeat 4–9 with different bugs | Same pattern |
| 16–18 | Harmless edits to `tax.js`, `cart.js`, `shipping.js` (one each) | All pass: check that the matching suite now ranks high in `would have run` |
| 19–20 | Harmless edits to `currency.js`, `dates.js` | All pass: the ranking should differ from 16–18 |

To break a suite without a real bug, change the module *and* set
`SMART_TESTS_DEMO_BREAK: "tax"` in the same commit, then unset it in the fix commit.

Push each step separately and let its run finish: Smart Tests compares each build with the
previous one, so squashing a break and its fix into one push teaches it nothing.
When the rankings in runs 16–20 follow the changed module, switch to `SMART_TESTS_MODE: subset`
for the time-saving demo, and try `SMART_TESTS_OPTIMIZATION: confidence` with `90%`.
