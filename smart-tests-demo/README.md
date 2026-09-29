# Smart Tests demo suite

A small, self-contained e-commerce library (`src/`) with ~50 tests (`suites/*.check.js`),
used to demonstrate **CloudBees Smart Tests** in `.cloudbees/workflows/smart-tests-demo.yaml`.
It isn't part of the app and isn't shipped in the Docker image.

- Tests are named `*.check.js`, so the app's own `npm test` (`node --test`) doesn't pick them up.
- Each test simulates work so suites have realistic, differing durations;
  `orders` is the slow "integration" suite.
- `inventory` › *handles concurrent reservations (flaky)* fails about 15% of runs on purpose,
  so Smart Tests has a flaky test to flag. Disable it with `SMART_TESTS_DEMO_FLAKY_RATE=0`.

Run locally:

```sh
node --test --test-concurrency=1 smart-tests-demo/suites/*.check.js
```

To see predictive test selection react to a change, edit one module in `src/`
(for example `tax.js`) in a PR. Smart Tests should then prioritise the suites that exercise it.
