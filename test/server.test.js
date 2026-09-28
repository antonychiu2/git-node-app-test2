const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../server');

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
