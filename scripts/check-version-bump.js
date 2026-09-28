#!/usr/bin/env node
// Fails a PR when VERSION isn't exactly 0.1 higher than the target branch's
// VERSION. Format is MAJOR.MINOR; MINOR keeps counting past 9 (1.9 -> 1.10),
// it does not roll over into MAJOR.
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

function parseVersion(raw, label) {
  const trimmed = raw.trim();
  const match = /^(\d+)\.(\d+)$/.exec(trimmed);
  if (!match) {
    fail(`${label} VERSION "${trimmed}" is not in MAJOR.MINOR format (e.g. 1.0)`);
  }
  return { major: Number(match[1]), minor: Number(match[2]), raw: trimmed };
}

const baseRef = process.argv[2];
if (!baseRef) {
  fail('Usage: check-version-bump.js <base-ref-or-sha>');
}

const head = parseVersion(fs.readFileSync('VERSION', 'utf8'), 'Head');

execFileSync('git', ['fetch', '--depth', '1', 'origin', baseRef], { stdio: 'inherit' });

// Read via FETCH_HEAD rather than baseRef itself: a bare branch name isn't
// guaranteed to resolve to a revision after a shallow fetch in every
// checkout configuration, but FETCH_HEAD always points at what was just
// fetched (whether baseRef was a branch name or a commit sha).
let baseRaw;
try {
  baseRaw = execFileSync('git', ['show', 'FETCH_HEAD:VERSION'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (error) {
  // The target branch predates VERSION (e.g. this is the PR introducing it).
  // Nothing to compare against, so any valid MAJOR.MINOR value is accepted.
  console.log(`Base branch has no VERSION file yet; accepting ${head.raw} as the starting version.`);
  process.exit(0);
}
const base = parseVersion(baseRaw, 'Base');

const expected = `${base.major}.${base.minor + 1}`;
if (head.major !== base.major || head.minor !== base.minor + 1) {
  fail(
    `VERSION must go from ${base.raw} to ${expected} (found ${head.raw}). ` +
      'Every PR must bump VERSION by exactly 0.1.'
  );
}

console.log(`VERSION bump OK: ${base.raw} -> ${head.raw}`);
