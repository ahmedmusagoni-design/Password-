const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApp } = require('./server');

async function startTestServer(t, appOptions = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'parent-api-'));
  const app = await createApp({ ...appOptions, dataFile: path.join(directory, 'data.json') });
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

  return { request, baseUrl };
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
    body: {
      code: invite.body.code,
      name,
      deviceId: 'device-id-12345678',
      consentAccepted: true,
    },
  });
}

test('one-time invites link a child and parent listing is family-scoped', async (t) => {
  const { request } = await startTestServer(t);
  const parent = await createParent(request);
  const invite = await request('/api/family/invites', { method: 'POST', token: parent.token });
  assert.equal(invite.status, 201);
  const child = await request('/api/family/link', {
    method: 'POST',
    body: {
      code: invite.body.code,
      name: 'Child',
      deviceId: 'device-id-12345678',
      consentAccepted: true,
    },
  });
  assert.equal(child.status, 201);
  assert.equal(child.body.user.role, 'child');

  const children = await request('/api/family/children', { token: parent.token });
  assert.deepEqual(children.body.children.map((item) => item.name), ['Child']);
  const reused = await request('/api/family/link', {
    method: 'POST',
    body: {
      code: invite.body.code,
      name: 'Other',
      deviceId: 'device-id-87654321',
      consentAccepted: true,
    },
  });
  assert.equal(reused.status, 401);
});

test('named profiles require child consent, link once, and can be unlinked by their parent', async (t) => {
  const { request } = await startTestServer(t);
  const parent = await createParent(request);
  const invite = await request('/api/family/invites', {
    method: 'POST',
    token: parent.token,
    body: { childName: 'Sam' },
  });
  assert.equal(invite.status, 201);
  assert.match(invite.body.code, /^\d{8}$/);

  const pending = await request('/api/family/profiles', { token: parent.token });
  assert.equal(pending.body.profiles[0].name, 'Sam');
  assert.equal(pending.body.profiles[0].linked, false);

  const withoutConsent = await request('/api/family/link', {
    method: 'POST',
    body: { code: invite.body.code, deviceId: 'device-id-12345678' },
  });
  assert.equal(withoutConsent.status, 400);

  const linked = await request('/api/family/link', {
    method: 'POST',
    body: {
      code: invite.body.code,
      deviceId: 'device-id-12345678',
      consentAccepted: true,
    },
  });
  assert.equal(linked.status, 201);
  assert.equal(linked.body.user.name, 'Sam');
  const replay = await request('/api/family/link', {
    method: 'POST',
    body: {
      code: invite.body.code,
      deviceId: 'device-id-87654321',
      consentAccepted: true,
    },
  });
  assert.equal(replay.status, 401);

  const removed = await request(`/api/family/children/${linked.body.user.id}`, {
    method: 'DELETE',
    token: parent.token,
  });
  assert.deepEqual(removed, { status: 200, body: { removed: true } });
  const profiles = await request('/api/family/profiles', { token: parent.token });
  assert.deepEqual(profiles.body.profiles, []);
  const revoked = await request('/api/auth/me', { token: linked.body.token });
  assert.equal(revoked.status, 401);
});

test('pairing attempts are rate limited and invitations expire', async (t) => {
  let time = Date.now();
  const { request } = await startTestServer(t, { now: () => time });
  const parent = await createParent(request);
  const invite = await request('/api/family/invites', {
    method: 'POST',
    token: parent.token,
    body: { childName: 'Rae' },
  });
  assert.equal(invite.status, 201);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const invalid = await request('/api/family/link', {
      method: 'POST',
      body: {
        code: invite.body.code === '00000000' ? '00000001' : '00000000',
        deviceId: 'device-id-12345678',
        consentAccepted: true,
      },
    });
    assert.equal(invalid.status, 401);
  }
  const limited = await request('/api/family/link', {
    method: 'POST',
    body: {
      code: invite.body.code,
      deviceId: 'device-id-12345678',
      consentAccepted: true,
    },
  });
  assert.equal(limited.status, 429);

  time += 16 * 60 * 1000;
  const expired = await request('/api/family/link', {
    method: 'POST',
    body: {
      code: invite.body.code,
      deviceId: 'device-id-12345678',
      consentAccepted: true,
    },
  });
  assert.equal(expired.status, 401);
});

test('the same-origin web app serves a PWA shell with revalidation headers', async (t) => {
  const { baseUrl } = await startTestServer(t);
  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(await page.text(), /Family Safety/);

  const manifest = await fetch(`${baseUrl}/manifest.webmanifest`);
  assert.equal(manifest.status, 200);
  assert.equal(manifest.headers.get('cache-control'), 'no-cache');
  assert.equal(manifest.headers.get('content-type'), 'application/manifest+json; charset=utf-8');
  assert.match(await manifest.text(), /"display": "standalone"/);

  const appScript = await fetch(`${baseUrl}/app.js`);
  assert.equal(appScript.status, 200);
  const appScriptText = await appScript.text();
  assert.match(appScriptText, /Could not reach the Family Safety server/);
  assert.match(appScriptText, /fetch\('\/health'/);
  assert.match(appScriptText, /crypto\.getRandomValues/);
  assert.doesNotMatch(appScriptText, /could not create a temporary device ID/);

  const serviceWorker = await fetch(`${baseUrl}/service-worker.js`);
  assert.equal(serviceWorker.status, 200);
  assert.match(await serviceWorker.text(), /family-safety-shell-v4/);
});

test('health endpoint returns an ok JSON response', async (t) => {
  const { request } = await startTestServer(t);
  assert.deepEqual(await request('/health'), {
    status: 200,
    body: { status: 'ok' },
  });
});

test('API CORS permits only the configured HTTPS app origin and handles preflight', async (t) => {
  const { baseUrl } = await startTestServer(t, {
    allowedOrigin: 'https://uppish-local-link-lab.base44.app',
  });
  const preflight = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://uppish-local-link-lab.base44.app',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'authorization,content-type',
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://uppish-local-link-lab.base44.app');
  assert.match(preflight.headers.get('access-control-allow-methods'), /POST/);
  assert.match(preflight.headers.get('access-control-allow-methods'), /PUT/);
  assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/);

  const denied = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://untrusted.example',
      'access-control-request-method': 'POST',
    },
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
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

test('parents configure family-scoped schedules that linked child devices can retrieve', async (t) => {
  const { request } = await startTestServer(t);
  const parent = await createParent(request);
  const child = await linkChild(request, parent.token);
  const route = `/api/family/children/${child.body.user.id}/restriction-schedule`;
  const defaults = await request(route, { token: parent.token });
  assert.equal(defaults.status, 200);
  assert.equal(defaults.body.schedule.homework.enabled, false);
  assert.equal(defaults.body.updatedAt, null);

  const schedule = {
    homework: { enabled: true, startTime: '16:00', endTime: '18:00' },
    bedtime: { enabled: true, startTime: '22:00', endTime: '07:00' },
    prayer: {
      enabled: true,
      times: { fajr: '05:30', dhuhr: '12:15', asr: '15:45', maghrib: '18:10', isha: '19:30' },
    },
  };
  const saved = await request(route, {
    method: 'PUT',
    token: parent.token,
    body: { schedule },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.schedule.homework.startTime, '16:00');
  assert.ok(saved.body.updatedAt);

  const childSchedule = await request('/api/devices/restriction-schedule', {
    token: child.body.token,
  });
  assert.deepEqual(childSchedule.body.schedule, schedule);
  assert.equal(childSchedule.body.updatedAt, saved.body.updatedAt);

  const otherParent = await createParent(request, 'other@example.test');
  const forbidden = await request(route, { token: otherParent.token });
  assert.equal(forbidden.status, 404);
  const parentCannotUseDeviceRoute = await request('/api/devices/restriction-schedule', {
    token: parent.token,
  });
  assert.equal(parentCannotUseDeviceRoute.status, 403);

  const removed = await request(`/api/family/children/${child.body.user.id}`, {
    method: 'DELETE',
    token: parent.token,
  });
  assert.equal(removed.status, 200);
  const removedSchedule = await request(route, { token: parent.token });
  assert.equal(removedSchedule.status, 404);
  const revokedDevice = await request('/api/devices/restriction-schedule', {
    token: child.body.token,
  });
  assert.equal(revokedDevice.status, 401);
});

test('parents can pause selected social apps and linked iOS devices acknowledge the applied revision', async (t) => {
  const { request } = await startTestServer(t);
  const parent = await createParent(request);
  const child = await linkChild(request, parent.token);
  const route = `/api/family/children/${child.body.user.id}/social-media-control`;

  const defaults = await request(route, { token: parent.token });
  assert.equal(defaults.status, 200);
  assert.equal(defaults.body.control.paused, false);
  assert.equal(defaults.body.control.revision, 0);
  assert.equal(defaults.body.control.updatedAt, null);

  const requested = await request(route, {
    method: 'PUT',
    token: parent.token,
    body: { paused: true },
  });
  assert.equal(requested.status, 200);
  assert.equal(requested.body.control.paused, true);
  assert.equal(requested.body.control.revision, 1);
  assert.equal(requested.body.control.acknowledgedRevision, null);

  const childControl = await request('/api/devices/social-media-control', {
    token: child.body.token,
  });
  assert.equal(childControl.body.control.paused, true);
  assert.equal(childControl.body.control.revision, 1);

  const acknowledged = await request('/api/devices/social-media-control/acknowledge', {
    method: 'POST',
    token: child.body.token,
    body: { revision: 1, paused: true },
  });
  assert.equal(acknowledged.status, 200);
  assert.equal(acknowledged.body.appliedPaused, true);
  const applied = await request(route, { token: parent.token });
  assert.equal(applied.body.control.acknowledgedRevision, 1);
  assert.equal(applied.body.control.appliedPaused, true);

  const resumed = await request(route, {
    method: 'PUT',
    token: parent.token,
    body: { paused: false },
  });
  assert.equal(resumed.body.control.revision, 2);
  assert.equal(resumed.body.control.acknowledgedRevision, null);
  const staleAcknowledgement = await request('/api/devices/social-media-control/acknowledge', {
    method: 'POST',
    token: child.body.token,
    body: { revision: 1, paused: true },
  });
  assert.equal(staleAcknowledgement.status, 409);

  const otherParent = await createParent(request, 'other@example.test');
  const forbidden = await request(route, { token: otherParent.token });
  assert.equal(forbidden.status, 404);
  const parentCannotReadDeviceControl = await request('/api/devices/social-media-control', {
    token: parent.token,
  });
  assert.equal(parentCannotReadDeviceControl.status, 403);

  const removed = await request(`/api/family/children/${child.body.user.id}`, {
    method: 'DELETE',
    token: parent.token,
  });
  assert.equal(removed.status, 200);
  const removedControl = await request(route, { token: parent.token });
  assert.equal(removedControl.status, 404);
});

test('schedule updates reject invalid times and incomplete prayer schedules', async (t) => {
  const { request } = await startTestServer(t);
  const parent = await createParent(request);
  const invite = await request('/api/family/invites', {
    method: 'POST',
    token: parent.token,
    body: { childName: 'Rae' },
  });
  assert.equal(invite.status, 201);
  const profiles = await request('/api/family/profiles', { token: parent.token });
  const route = `/api/family/children/${profiles.body.profiles[0].id}/restriction-schedule`;
  const invalidTime = await request(route, {
    method: 'PUT',
    token: parent.token,
    body: {
      schedule: {
        homework: { enabled: true, startTime: '25:00', endTime: '17:00' },
        bedtime: { enabled: false, startTime: '21:00', endTime: '07:00' },
        prayer: { enabled: false, times: { fajr: '', dhuhr: '', asr: '', maghrib: '', isha: '' } },
      },
    },
  });
  assert.equal(invalidTime.status, 400);

  const incompletePrayer = await request(route, {
    method: 'PUT',
    token: parent.token,
    body: {
      schedule: {
        homework: { enabled: false, startTime: '15:00', endTime: '17:00' },
        bedtime: { enabled: false, startTime: '21:00', endTime: '07:00' },
        prayer: { enabled: true, times: { fajr: '05:30', dhuhr: '', asr: '15:45', maghrib: '18:10', isha: '19:30' } },
      },
    },
  });
  assert.equal(incompletePrayer.status, 400);
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
