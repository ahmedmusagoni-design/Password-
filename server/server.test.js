const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApp } = require('./server');

async function startTestServer(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'parent-api-'));
  const app = await createApp({ dataFile: path.join(directory, 'data.json') });
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  });

  async function request(route, { method = 'GET', token, body } = {}) {
    const response = await fetch(`${baseUrl}${route}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json() };
  }

  return { request };
}

async function createParent(request, email = 'parent@example.test') {
  const result = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Parent', email, password: 'a-secure-password-123' },
  });
  assert.equal(result.status, 201);
  return result.body;
}

async function linkChild(request, parentToken, name = 'Child') {
  const invite = await request('/api/family/invites', { method: 'POST', token: parentToken });
  assert.equal(invite.status, 201);
  return request('/api/family/link', {
    method: 'POST',
    body: { code: invite.body.code, name, deviceId: 'device-id-12345678' },
  });
}

test('one-time invites link a child and parent listing is family-scoped', async (t) => {
  const { request } = await startTestServer(t);
  const parent = await createParent(request);
  const invite = await request('/api/family/invites', { method: 'POST', token: parent.token });
  assert.equal(invite.status, 201);
  const child = await request('/api/family/link', {
    method: 'POST',
    body: { code: invite.body.code, name: 'Child', deviceId: 'device-id-12345678' },
  });
  assert.equal(child.status, 201);
  assert.equal(child.body.user.role, 'child');

  const children = await request('/api/family/children', { token: parent.token });
  assert.deepEqual(children.body.children.map((item) => item.name), ['Child']);
  const reused = await request('/api/family/link', {
    method: 'POST',
    body: { code: invite.body.code, name: 'Other', deviceId: 'device-id-87654321' },
  });
  assert.equal(reused.status, 401);
});

test('usage sync validates summaries and only the linked family can read them', async (t) => {
  const { request } = await startTestServer(t);
  const parent = await createParent(request);
  const child = await linkChild(request, parent.token);
  const synced = await request('/api/devices/sync', {
    method: 'POST',
    token: child.body.token,
    body: { day: '2026-11-06', totalMinutes: 80, categories: [{ category: 'education', minutes: 30 }] },
  });
  assert.equal(synced.status, 200);
  const listed = await request(`/api/family/children/${child.body.user.id}/usage?day=2026-11-06`, { token: parent.token });
  assert.equal(listed.body.usage.totalMinutes, 80);
  assert.equal(listed.body.usage.source, 'self_reported');

  const other = await createParent(request, 'other@example.test');
  const forbidden = await request(`/api/family/children/${child.body.user.id}/usage?day=2026-11-06`, { token: other.token });
  assert.equal(forbidden.status, 404);
  const invalid = await request('/api/devices/sync', {
    method: 'POST',
    token: child.body.token,
    body: { day: '2026-02-30', totalMinutes: 5, categories: [] },
  });
  assert.equal(invalid.status, 400);
});

test('SOS alerts keep location optional and are only visible to the linked parent', async (t) => {
  const { request } = await startTestServer(t);
  const parent = await createParent(request);
  const child = await linkChild(request, parent.token);
  const sent = await request('/api/devices/alerts', {
    method: 'POST',
    token: child.body.token,
    body: { type: 'sos', location: { latitude: 47.6, longitude: -122.3, accuracy: 10 } },
  });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.alert.location.latitude, 47.6);
  const alerts = await request('/api/family/alerts', { token: parent.token });
  assert.equal(alerts.body.alerts.length, 1);
  const other = await createParent(request, 'other@example.test');
  const isolated = await request('/api/family/alerts', { token: other.token });
  assert.equal(isolated.body.alerts.length, 0);
});

test('parent control requests require the child response and do not claim device enforcement', async (t) => {
  const { request } = await startTestServer(t);
  const parent = await createParent(request);
  const child = await linkChild(request, parent.token);
  const created = await request(`/api/family/children/${child.body.user.id}/control-requests`, {
    method: 'POST',
    token: parent.token,
    body: { type: 'daily_limit', minutes: 120 },
  });
  assert.equal(created.status, 201);
  const pending = await request('/api/devices/control-requests', { token: child.body.token });
  assert.equal(pending.body.requests[0].minutes, 120);
  const accepted = await request(`/api/devices/control-requests/${created.body.request.id}/respond`, {
    method: 'POST',
    token: child.body.token,
    body: { status: 'accepted' },
  });
  assert.equal(accepted.body.request.status, 'accepted');
});

test('authentication rejects invalid credentials and role mismatches', async (t) => {
  const { request } = await startTestServer(t);
  await createParent(request);
  const invalidLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'parent@example.test', password: 'wrong-password-123' },
  });
  assert.equal(invalidLogin.status, 401);
  const parent = await createParent(request, 'another@example.test');
  const forbidden = await request('/api/devices/control-requests', { token: parent.token });
  assert.equal(forbidden.status, 403);
});
