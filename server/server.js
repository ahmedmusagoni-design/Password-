const { createServer } = require('node:http');
const { randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual, createHash } = require('node:crypto');
const { mkdir, readFile, rename, writeFile } = require('node:fs/promises');
const path = require('node:path');

const CATEGORIES = new Set(['education', 'social', 'games', 'video', 'communication', 'other']);
const MAX_BODY_BYTES = 32 * 1024;
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const INVITE_TTL_MS = 10 * 60 * 1000;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function emptyState() {
  return { users: [], invites: [], usage: [], alerts: [], controlRequests: [] };
}

function safeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function validateName(value) {
  if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > 80) {
    throw new HttpError(400, 'Name must be between 1 and 80 characters.');
  }
  return value.trim();
}

function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) {
    throw new HttpError(400, 'Password must be between 12 and 128 characters.');
  }
  return value;
}

function validateDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, 'day must be a YYYY-MM-DD date.');
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, 'day must be a valid calendar date.');
  }
  return value;
}

function validateMinutes(value, field) {
  if (!Number.isInteger(value) || value < 0 || value > 1440) {
    throw new HttpError(400, `${field} must be an integer from 0 to 1440.`);
  }
  return value;
}

async function readJsonBody(req) {
  const declaredSize = Number(req.headers['content-length'] || 0);
  if (declaredSize > MAX_BODY_BYTES) throw new HttpError(413, 'Request body is too large.');

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Request body is too large.');
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || Array.isArray(body) || typeof body !== 'object') {
      throw new Error('Expected an object.');
    }
    return body;
  } catch {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(body);
}

async function createApp({
  dataFile = process.env.PARENT_API_DATA_FILE || path.join(__dirname, 'data.json'),
  now = () => Date.now(),
  tokenTtlMs = TOKEN_TTL_MS,
} = {}) {
  let state = emptyState();
  try {
    const stored = JSON.parse(await readFile(dataFile, 'utf8'));
    if (!stored || !Array.isArray(stored.users) || !Array.isArray(stored.invites)
      || !Array.isArray(stored.usage) || !Array.isArray(stored.alerts)
      || !Array.isArray(stored.controlRequests)) {
      throw new Error('Stored API data has an invalid shape.');
    }
    state = stored;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const sessions = new Map();
  const loginAttempts = new Map();
  const registrationAttempts = new Map();
  const pairingAttempts = new Map();
  let writeQueue = Promise.resolve();

  function persist() {
    const snapshot = JSON.stringify(state);
    writeQueue = writeQueue.then(async () => {
      await mkdir(path.dirname(dataFile), { recursive: true });
      const temporaryFile = `${dataFile}.${randomUUID()}.tmp`;
      await writeFile(temporaryFile, snapshot, { encoding: 'utf8', mode: 0o600 });
      await rename(temporaryFile, dataFile);
    });
    return writeQueue;
  }

  function issueSession(user) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = now() + tokenTtlMs;
    sessions.set(token, { userId: user.id, expiresAt });
    return { token, expiresAt };
  }

  function authenticatedUser(req) {
    const match = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
    if (!match) throw new HttpError(401, 'Sign in is required.');
    const session = sessions.get(match[1]);
    if (!session || session.expiresAt <= now()) {
      sessions.delete(match[1]);
      throw new HttpError(401, 'Session expired. Sign in again.');
    }
    const user = state.users.find((item) => item.id === session.userId);
    if (!user) throw new HttpError(401, 'Session is no longer valid.');
    return user;
  }

  function requireRole(req, role) {
    const user = authenticatedUser(req);
    if (user.role !== role) throw new HttpError(403, 'This action is not available to this account.');
    return user;
  }

  function verifyLoginRate(req) {
    const address = req.socket.remoteAddress || 'unknown';
    const attempt = loginAttempts.get(address);
    if (attempt && now() - attempt.startedAt < 15 * 60 * 1000 && attempt.count >= 5) {
      throw new HttpError(429, 'Too many sign-in attempts. Try again in 15 minutes.');
    }
    if (!attempt || now() - attempt.startedAt >= 15 * 60 * 1000) {
      loginAttempts.set(address, { startedAt: now(), count: 1 });
    } else {
      attempt.count += 1;
    }
  }

  function verifyRequestRate(rateMap, req, limit, message) {
    const address = req.socket.remoteAddress || 'unknown';
    const attempt = rateMap.get(address);
    if (attempt && now() - attempt.startedAt < 15 * 60 * 1000 && attempt.count >= limit) {
      throw new HttpError(429, message);
    }
    if (!attempt || now() - attempt.startedAt >= 15 * 60 * 1000) {
      rateMap.set(address, { startedAt: now(), count: 1 });
    } else {
      attempt.count += 1;
    }
  }

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const { pathname } = url;

    if (req.method === 'GET' && pathname === '/health') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/register') {
      verifyRequestRate(registrationAttempts, req, 5, 'Too many registration attempts. Try again in 15 minutes.');
      const body = await readJsonBody(req);
      const name = validateName(body.name);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new HttpError(400, 'Enter a valid email address.');
      }
      const password = validatePassword(body.password);
      if (state.users.some((user) => user.email === email)) {
        throw new HttpError(409, 'An account with this email already exists.');
      }
      const salt = randomBytes(16);
      const user = {
        id: randomUUID(),
        familyId: randomUUID(),
        name,
        email,
        role: 'parent',
        passwordSalt: salt.toString('hex'),
        passwordHash: scryptSync(password, salt, 64).toString('hex'),
        createdAt: new Date(now()).toISOString(),
      };
      state.users.push(user);
      const session = issueSession(user);
      await persist();
      sendJson(res, 201, { ...session, user: safeUser(user) });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
      verifyLoginRate(req);
      const body = await readJsonBody(req);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' && body.password.length <= 128 ? body.password : '';
      const user = state.users.find((item) => item.email === email);
      const salt = user ? Buffer.from(user.passwordSalt, 'hex') : Buffer.alloc(16, 1);
      const expected = user ? Buffer.from(user.passwordHash, 'hex') : Buffer.alloc(64);
      const actual = scryptSync(password || '\0', salt, 64);
      if (!user || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        throw new HttpError(401, 'Email or password is incorrect.');
      }
      loginAttempts.delete(req.socket.remoteAddress || 'unknown');
      const session = issueSession(user);
      sendJson(res, 200, { ...session, user: safeUser(user) });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/family/link') {
      verifyRequestRate(pairingAttempts, req, 5, 'Too many pairing attempts. Try again in 15 minutes.');
      const body = await readJsonBody(req);
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
      const name = validateName(body.name);
      if (!/^\d{6}$/.test(code) || deviceId.length < 8 || deviceId.length > 128) {
        throw new HttpError(400, 'A six-digit invite code and valid device ID are required.');
      }
      const codeHash = createHash('sha256').update(code).digest('hex');
      const index = state.invites.findIndex((invite) => invite.codeHash === codeHash
        && invite.expiresAt > now());
      if (index < 0) throw new HttpError(401, 'Invite code is invalid or expired.');
      const [invite] = state.invites.splice(index, 1);
      const user = {
        id: randomUUID(),
        familyId: invite.familyId,
        name,
        email: null,
        role: 'child',
        deviceId,
        createdAt: new Date(now()).toISOString(),
        lastSyncAt: null,
      };
      state.users.push(user);
      const session = issueSession(user);
      await persist();
      pairingAttempts.delete(req.socket.remoteAddress || 'unknown');
      sendJson(res, 201, { ...session, user: safeUser(user) });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/auth/me') {
      sendJson(res, 200, { user: safeUser(authenticatedUser(req)) });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/family/invites') {
      const parent = requireRole(req, 'parent');
      state.invites = state.invites.filter((invite) => invite.expiresAt > now());
      let code;
      do {
        code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      } while (state.invites.some((invite) => invite.codeHash
        === createHash('sha256').update(code).digest('hex') && invite.expiresAt > now()));
      const expiresAt = now() + INVITE_TTL_MS;
      state.invites.push({
        codeHash: createHash('sha256').update(code).digest('hex'),
        familyId: parent.familyId,
        expiresAt,
      });
      await persist();
      sendJson(res, 201, { code, expiresAt });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/family/children') {
      const parent = requireRole(req, 'parent');
      const children = state.users
        .filter((user) => user.role === 'child' && user.familyId === parent.familyId)
        .map(({ id, name, createdAt, lastSyncAt }) => ({ id, name, createdAt, lastSyncAt }));
      sendJson(res, 200, { children });
      return;
    }

    const usageMatch = /^\/api\/family\/children\/([^/]+)\/usage$/.exec(pathname);
    if (req.method === 'GET' && usageMatch) {
      const parent = requireRole(req, 'parent');
      const child = state.users.find((user) => user.id === usageMatch[1]
        && user.role === 'child' && user.familyId === parent.familyId);
      if (!child) throw new HttpError(404, 'Child was not found in this family.');
      const day = validateDay(url.searchParams.get('day'));
      const summary = state.usage.find((item) => item.childId === child.id && item.day === day);
      sendJson(res, 200, {
        usage: summary || { day, totalMinutes: 0, categories: [] },
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/devices/sync') {
      const child = requireRole(req, 'child');
      const body = await readJsonBody(req);
      const day = validateDay(body.day);
      const totalMinutes = validateMinutes(body.totalMinutes, 'totalMinutes');
      if (!Array.isArray(body.categories) || body.categories.length > CATEGORIES.size) {
        throw new HttpError(400, 'categories must be an array of supported usage summaries.');
      }
      const seen = new Set();
      const categories = body.categories.map((item) => {
        if (!item || !CATEGORIES.has(item.category) || seen.has(item.category)) {
          throw new HttpError(400, 'Each supported category may appear only once.');
        }
        seen.add(item.category);
        return { category: item.category, minutes: validateMinutes(item.minutes, 'category minutes') };
      });
      if (categories.reduce((sum, item) => sum + item.minutes, 0) > totalMinutes) {
        throw new HttpError(400, 'Category minutes cannot exceed totalMinutes.');
      }
      const summary = {
        childId: child.id,
        day,
        totalMinutes,
        categories,
        source: 'self_reported',
        updatedAt: new Date(now()).toISOString(),
      };
      const existing = state.usage.findIndex((item) => item.childId === child.id && item.day === day);
      if (existing < 0) state.usage.push(summary);
      else state.usage[existing] = summary;
      child.lastSyncAt = summary.updatedAt;
      await persist();
      sendJson(res, 200, {
        usage: { day, totalMinutes, categories, source: summary.source, updatedAt: summary.updatedAt },
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/devices/alerts') {
      const child = requireRole(req, 'child');
      const body = await readJsonBody(req);
      if (!['sos', 'usage_limit'].includes(body.type)) {
        throw new HttpError(400, 'type must be sos or usage_limit.');
      }
      let location;
      if (body.location !== undefined) {
        if (body.type !== 'sos' || !body.location
          || !Number.isFinite(body.location.latitude) || Math.abs(body.location.latitude) > 90
          || !Number.isFinite(body.location.longitude) || Math.abs(body.location.longitude) > 180
          || !Number.isFinite(body.location.accuracy) || body.location.accuracy < 0
          || body.location.accuracy > 5000) {
          throw new HttpError(400, 'Location is only accepted for SOS alerts and must be valid.');
        }
        location = {
          latitude: body.location.latitude,
          longitude: body.location.longitude,
          accuracy: body.location.accuracy,
        };
      }
      const alert = {
        id: randomUUID(),
        familyId: child.familyId,
        childId: child.id,
        type: body.type,
        createdAt: new Date(now()).toISOString(),
        acknowledgedAt: null,
        ...(location ? { location } : {}),
      };
      state.alerts.push(alert);
      await persist();
      sendJson(res, 201, { alert: { ...alert, familyId: undefined } });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/family/alerts') {
      const parent = requireRole(req, 'parent');
      const alerts = state.alerts
        .filter((alert) => alert.familyId === parent.familyId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 100)
        .map(({ familyId, ...alert }) => alert);
      sendJson(res, 200, { alerts });
      return;
    }

    const acknowledgeMatch = /^\/api\/family\/alerts\/([^/]+)\/acknowledge$/.exec(pathname);
    if (req.method === 'POST' && acknowledgeMatch) {
      const parent = requireRole(req, 'parent');
      const alert = state.alerts.find((item) => item.id === acknowledgeMatch[1]
        && item.familyId === parent.familyId);
      if (!alert) throw new HttpError(404, 'Alert was not found in this family.');
      alert.acknowledgedAt = new Date(now()).toISOString();
      await persist();
      sendJson(res, 200, { alert: { ...alert, familyId: undefined } });
      return;
    }

    const controlMatch = /^\/api\/family\/children\/([^/]+)\/control-requests$/.exec(pathname);
    if (req.method === 'POST' && controlMatch) {
      const parent = requireRole(req, 'parent');
      const child = state.users.find((user) => user.id === controlMatch[1]
        && user.role === 'child' && user.familyId === parent.familyId);
      if (!child) throw new HttpError(404, 'Child was not found in this family.');
      const body = await readJsonBody(req);
      let request;
      if (body.type === 'daily_limit') {
        request = { type: body.type, minutes: validateMinutes(body.minutes, 'minutes') };
      } else if (body.type === 'focus_session') {
        if (!Number.isInteger(body.minutes) || body.minutes < 15 || body.minutes > 180) {
          throw new HttpError(400, 'Focus session minutes must be from 15 to 180.');
        }
        request = { type: body.type, minutes: body.minutes };
      } else {
        throw new HttpError(400, 'type must be daily_limit or focus_session.');
      }
      const controlRequest = {
        id: randomUUID(),
        childId: child.id,
        parentId: parent.id,
        ...request,
        status: 'pending',
        createdAt: new Date(now()).toISOString(),
        respondedAt: null,
      };
      state.controlRequests.push(controlRequest);
      await persist();
      sendJson(res, 201, { request: controlRequest });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/devices/control-requests') {
      const child = requireRole(req, 'child');
      const requests = state.controlRequests.filter((item) => item.childId === child.id && item.status === 'pending');
      sendJson(res, 200, { requests });
      return;
    }

    const respondMatch = /^\/api\/devices\/control-requests\/([^/]+)\/respond$/.exec(pathname);
    if (req.method === 'POST' && respondMatch) {
      const child = requireRole(req, 'child');
      const body = await readJsonBody(req);
      if (!['accepted', 'declined'].includes(body.status)) {
        throw new HttpError(400, 'status must be accepted or declined.');
      }
      const request = state.controlRequests.find((item) => item.id === respondMatch[1]
        && item.childId === child.id && item.status === 'pending');
      if (!request) throw new HttpError(404, 'Pending request was not found for this device.');
      request.status = body.status;
      request.respondedAt = new Date(now()).toISOString();
      await persist();
      sendJson(res, 200, { request });
      return;
    }

    throw new HttpError(404, 'Route was not found.');
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((error) => {
      if (!(error instanceof HttpError)) {
        console.error('API request failed:', error.message);
      }
      if (!res.headersSent) {
        sendJson(res, error instanceof HttpError ? error.status : 500, {
          error: error instanceof HttpError ? error.message : 'The request could not be completed.',
        });
      } else {
        res.destroy();
      }
    });
  });

  return {
    server,
    close: async () => {
      await writeQueue;
      if (server.listening) await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    },
  };
}

if (require.main === module) {
  createApp().then(({ server }) => {
    const port = Number(process.env.PORT || 4000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1-65535.');
    const host = process.env.HOST || '127.0.0.1';
    server.listen(port, host, () => console.log(`Parent control API listening on http://${host}:${port}`));
  }).catch((error) => {
    console.error('Could not start API:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { createApp };
