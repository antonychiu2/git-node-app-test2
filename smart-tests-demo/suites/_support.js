const path = require('node:path');

// SMART_TESTS_DEMO_BREAK=tax,cart makes every test in those suites fail, as if
// the change under test broke them, to seed Smart Tests with change -> failure
// history without editing tests. node --test runs each file in its own
// process, so require.main is the suite file.
const broken = new Set((process.env.SMART_TESTS_DEMO_BREAK ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const suite = require.main ? path.basename(require.main.filename).split('.')[0] : '';

// Simulated work so tests have realistic, differing durations; this is what
// lets Smart Tests show time savings when it runs a subset.
const work = (ms) => new Promise((resolve, reject) => setTimeout(() => {
  if (broken.has(suite)) reject(new Error(`simulated regression (SMART_TESTS_DEMO_BREAK=${suite})`));
  else resolve();
}, ms));

module.exports = { work };
