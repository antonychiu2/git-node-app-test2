#!/usr/bin/env node
// Prints a Markdown evidence item for a CI test run, for the Unify "Evidence"
// tab (published with cloudbees-io/publish-evidence-item). It reads the JUnit
// report written by `node --test --test-reporter=junit` and the exit code the
// test step saved, so it also reports runs whose tests failed.
//
//   junit-evidence.js <junit.xml> <exit-code-file> <label>
//
// Optional environment: COMMIT, BRANCH, REPO_URL (source commit link) and
// SMART_TESTS_SESSION_FILE (defaults to .smart-tests/session.txt).
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');

const [junitPath, exitCodePath, label = 'Unit tests'] = process.argv.slice(2);
if (!junitPath || !exitCodePath) {
  console.error('Usage: junit-evidence.js <junit.xml> <exit-code-file> <label>');
  process.exit(2);
}

const MAX_LISTED_TESTS = 200;

function read(path) {
  try {
    return fs.readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

function unescapeXml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// Keeps a value on one Markdown table row.
function cell(text) {
  return String(text).replace(/</g, '&lt;').replace(/\s+/g, ' ').replace(/\|/g, '\\|').replace(/`/g, "'").trim();
}

function attr(tag, name) {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return match ? unescapeXml(match[1]) : '';
}

// Walks <testsuite>/<testcase> elements in order so each case knows its suite.
function parseJunit(xml) {
  const cases = [];
  const suites = [];
  // Attribute values can hold an unescaped ">", so tags are matched quote-aware.
  const token = /<testsuite\b(?:"[^"]*"|[^">])*>|<\/testsuite>|<testcase\b(?:"[^"]*"|[^"/>])*(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  let match;
  while ((match = token.exec(xml))) {
    const tag = match[0];
    if (tag.startsWith('</testsuite')) {
      suites.pop();
    } else if (tag.startsWith('<testsuite')) {
      suites.push(attr(tag, 'name'));
    } else {
      const body = match[1] || '';
      let status = 'passed';
      let message = '';
      if (/<failure\b/.test(body) || /<error\b/.test(body)) {
        status = 'failed';
        message = attr(/<(?:failure|error)\b(?:"[^"]*"|[^">])*>/.exec(body)[0], 'message');
      } else if (/<skipped\b[^>]*type="todo"/.test(body)) {
        status = 'todo';
      } else if (/<skipped\b/.test(body)) {
        status = 'skipped';
      }
      cases.push({
        suite: suites.join(' › '),
        name: attr(tag, 'name'),
        seconds: Number(attr(tag, 'time')) || 0,
        status,
        message,
      });
    }
  }

  // The node reporter writes run totals as trailing comments.
  const totals = {};
  for (const [, key, value] of xml.matchAll(/<!--\s*(\w+)\s+([\d.]+)\s*-->/g)) {
    totals[key] = Number(value);
  }
  return { cases, totals };
}

const ICON = { passed: '✅', failed: '❌', skipped: '⏭️', todo: '📝' };

const exitCodeRaw = read(exitCodePath);
const exitCode = exitCodeRaw === null ? null : Number(exitCodeRaw.trim());
const xml = read(junitPath);
const { cases, totals } = xml ? parseJunit(xml) : { cases: [], totals: {} };

const count = (status) => cases.filter((c) => c.status === status).length;
const passed = totals.pass ?? count('passed');
const failed = totals.fail ?? count('failed');
const skipped = totals.skipped ?? count('skipped');
const todo = totals.todo ?? count('todo');
const cancelled = totals.cancelled ?? 0;
const total = totals.tests ?? cases.length;

const ok = exitCode === 0 && xml !== null && failed === 0 && cancelled === 0;
const out = [];
const line = (text = '') => out.push(text);

line(`## ${ok ? '✅' : '❌'} ${label}: ${ok ? 'passed' : 'failed'} (${passed}/${total} passed)`);
line();
if (xml === null) {
  line(`No JUnit report was found at \`${junitPath}\`, so the test run did not complete.`);
  line();
}

const commit = process.env.COMMIT || '';
const repoUrl = (process.env.REPO_URL || '').replace(/\.git$/, '');
const lockfile = read('package-lock.json');
const session = read(process.env.SMART_TESTS_SESSION_FILE || '.smart-tests/session.txt');

line('### Run');
line('| | |');
line('|---|---|');
line(`| Result | **${ok ? 'Passed' : 'Failed'}** (test runner exit code \`${exitCode ?? 'unknown'}\`) |`);
line(`| Node.js | \`${process.version}\` |`);
if (commit) {
  const short = commit.slice(0, 12);
  line(`| Commit | ${repoUrl.startsWith('http') ? `[\`${short}\`](${repoUrl}/commit/${commit})` : `\`${short}\``} |`);
}
if (process.env.BRANCH) line(`| Branch | \`${cell(process.env.BRANCH)}\` |`);
line('| Command | `npm ci` then `node --test` (spec + JUnit reporters) |');
if (lockfile !== null) {
  const digest = crypto.createHash('sha256').update(lockfile).digest('hex');
  line(`| Dependencies | installed from \`package-lock.json\` (sha256 \`${digest.slice(0, 16)}…\`) |`);
}
if (totals.duration_ms !== undefined) line(`| Duration | ${(totals.duration_ms / 1000).toFixed(2)} s |`);
line(`| JUnit report | \`${junitPath}\`, published to the run's Tests tab |`);
line(`| Smart Tests | ${session ? `session \`${cell(session)}\`` : 'not recorded for this run'} |`);

line();
line('### Totals');
line('| Passed | Failed | Skipped | Todo | Cancelled | Total |');
line('|---:|---:|---:|---:|---:|---:|');
line(`| ${passed} | ${failed} | ${skipped} | ${todo} | ${cancelled} | ${total} |`);

const failures = cases.filter((c) => c.status === 'failed');
if (failures.length > 0) {
  line();
  line('### Failures');
  line('| Test | Message |');
  line('|---|---|');
  for (const c of failures) {
    line(`| ${cell([c.suite, c.name].filter(Boolean).join(' › '))} | ${cell(c.message || 'failed')} |`);
  }
}

if (cases.length > 0) {
  line();
  line('### Test cases');
  line('| | Test | Time |');
  line('|---|---|---:|');
  for (const c of cases.slice(0, MAX_LISTED_TESTS)) {
    line(`| ${ICON[c.status]} | ${cell([c.suite, c.name].filter(Boolean).join(' › '))} | ${(c.seconds * 1000).toFixed(0)} ms |`);
  }
  if (cases.length > MAX_LISTED_TESTS) {
    line();
    line(`…and ${cases.length - MAX_LISTED_TESTS} more; see the run's Tests tab for the full list.`);
  }
}

process.stdout.write(out.join('\n') + '\n');
