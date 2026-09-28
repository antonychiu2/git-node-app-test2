// Simulated work so tests have realistic, differing durations; this is what
// lets Smart Tests show time savings when it runs a subset.
const work = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { work };
