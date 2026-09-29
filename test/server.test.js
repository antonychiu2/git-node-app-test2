const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');

const app = require('../server');

// Grouped in a suite so the JUnit report nests test cases in a <testsuite>,
// which CloudBees Unify's test results parser requires.
describe('git-node-app API', () => {
  test('GET / serves the web interface', async () => {
    const res = await request(app).get('/');

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/html/);
  });

  test('GET /api/check-git reports the working directory is a git repo', async () => {
    const res = await request(app).get('/api/check-git');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.isGitRepo, true);
  });

  test('GET /api/log returns recent commits as a list', async () => {
    const res = await request(app).get('/api/log');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.commits));
    assert.ok(res.body.commits.length > 0, 'expected at least one commit');
    assert.ok(res.body.commits.length <= 10, 'expected at most 10 commits');
  });

  test('GET /api/version returns the contents of the VERSION file', async () => {
    const expected = fs.readFileSync(path.join(__dirname, '..', 'VERSION'), 'utf8').trim();

    const res = await request(app).get('/api/version');

    assert.equal(res.status, 200);
    assert.equal(res.body.version, expected);
  });

  test('GET /api/build-info is hidden by default (show-build-info flag off)', async () => {
    const res = await request(app).get('/api/build-info');

    assert.equal(res.status, 404);
  });
});
