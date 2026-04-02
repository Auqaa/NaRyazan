const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const jwt = require('jsonwebtoken');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'role-access-'));
const dbPath = path.join(tempDir, 'db.json');
const templatePath = path.join(tempDir, 'db.template.json');

process.env.JWT_SECRET = 'role-access-test-secret';
process.env.FILE_DB_PATH = dbPath;
process.env.FILE_DB_TEMPLATE_PATH = templatePath;

const { resetDbCache } = require('../storage/fileDb');
const app = require('../app');

const makeFixture = (overrides = {}) => ({
  users: [
    {
      _id: 'admin-1',
      name: 'Admin',
      email: 'admin@test.local',
      phone: '',
      password: 'admin123',
      balance: 0,
      completedRoutes: [],
      scannedPoints: [],
      favoriteRoutes: [],
      avatar: '',
      hideFromLeaderboard: true,
      payments: [],
      role: 'Administrator',
      verification: {
        email: { verified: true, pendingCode: null, requestedAt: null, verifiedAt: '2026-04-02T10:00:00.000Z' },
        phone: { verified: false, pendingCode: null, requestedAt: null, verifiedAt: null }
      },
      createdAt: '2026-04-02T10:00:00.000Z'
    },
    {
      _id: 'guide-1',
      name: 'Guide',
      email: 'guide@test.local',
      phone: '',
      password: 'guide123',
      balance: 0,
      completedRoutes: [],
      scannedPoints: [],
      favoriteRoutes: [],
      avatar: '',
      hideFromLeaderboard: true,
      payments: [],
      role: 'Guide',
      verification: {
        email: { verified: true, pendingCode: null, requestedAt: null, verifiedAt: '2026-04-02T10:00:00.000Z' },
        phone: { verified: false, pendingCode: null, requestedAt: null, verifiedAt: null }
      },
      createdAt: '2026-04-02T10:00:00.000Z'
    },
    {
      _id: 'curator-1',
      name: 'Curator',
      email: 'curator@test.local',
      phone: '',
      password: 'curator123',
      balance: 0,
      completedRoutes: [],
      scannedPoints: [],
      favoriteRoutes: [],
      avatar: '',
      hideFromLeaderboard: true,
      payments: [],
      role: 'Curator',
      verification: {
        email: { verified: true, pendingCode: null, requestedAt: null, verifiedAt: '2026-04-02T10:00:00.000Z' },
        phone: { verified: false, pendingCode: null, requestedAt: null, verifiedAt: null }
      },
      createdAt: '2026-04-02T10:00:00.000Z'
    },
    {
      _id: 'user-1',
      name: 'User',
      email: 'user@test.local',
      phone: '',
      password: 'user123',
      balance: 0,
      completedRoutes: [],
      scannedPoints: [],
      favoriteRoutes: [],
      avatar: '',
      hideFromLeaderboard: false,
      payments: [],
      role: 'User',
      verification: {
        email: { verified: true, pendingCode: null, requestedAt: null, verifiedAt: '2026-04-02T10:00:00.000Z' },
        phone: { verified: false, pendingCode: null, requestedAt: null, verifiedAt: null }
      },
      createdAt: '2026-04-02T10:00:00.000Z'
    },
    {
      _id: 'legacy-1',
      name: 'Legacy',
      email: 'legacy@test.local',
      phone: '',
      password: 'legacy123',
      balance: 0,
      completedRoutes: [],
      scannedPoints: [],
      favoriteRoutes: [],
      avatar: '',
      hideFromLeaderboard: false,
      payments: [],
      verification: {
        email: { verified: true, pendingCode: null, requestedAt: null, verifiedAt: '2026-04-02T10:00:00.000Z' },
        phone: { verified: false, pendingCode: null, requestedAt: null, verifiedAt: null }
      },
      createdAt: '2026-04-02T10:00:00.000Z'
    }
  ],
  routes: [
    {
      _id: 'route-1',
      name: 'History Walk',
      description: 'Main historical route',
      category: 'History',
      points: ['point-1'],
      totalReward: 20,
      image: '',
      city: 'Ryazan',
      themes: ['history']
    }
  ],
  routePacks: [
    {
      _id: 'pack-1',
      name: 'Guide Pack',
      description: 'For live tours',
      promise: 'A compact live scenario',
      badges: ['Featured'],
      practicalNotes: 'Bring comfortable shoes.',
      image: '',
      featured: true,
      sortOrder: 1,
      status: 'published',
      routes: [{ routeId: 'route-1', role: 'primary', reason: 'Main route', order: 1 }]
    }
  ],
  points: [
    {
      _id: 'point-1',
      routeId: 'route-1',
      name: 'Kremlin',
      description: 'Old city center',
      address: 'Main square',
      lat: 54.63,
      lng: 39.75,
      qrCodeValue: 'qr-1',
      reward: 20,
      order: 1,
      guideText: 'Dedicated guide text',
      guideAudioUrl: '',
      facts: [],
      waypointType: 'regular'
    }
  ],
  rewards: [],
  optionalStops: [],
  scans: [],
  ...overrides
});

const makeToken = (userId) => jwt.sign({ user: { id: userId } }, process.env.JWT_SECRET, { expiresIn: '1h' });

const writeFixture = (fixture) => {
  fs.writeFileSync(dbPath, JSON.stringify(fixture, null, 2), 'utf-8');
  fs.writeFileSync(templatePath, JSON.stringify(fixture, null, 2), 'utf-8');
  resetDbCache();
};

const startServer = async (t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
};

const requestJson = async (baseUrl, pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();

  return {
    response,
    data: text ? JSON.parse(text) : null
  };
};

const routePayload = {
  name: 'Curated route',
  description: 'Created by curator',
  category: 'History',
  image: '',
  waypoints: [
    {
      name: 'Curated stop',
      description: 'A new stop',
      address: 'Street 1',
      lat: 54.631,
      lng: 39.751,
      order: 1,
      waypointType: 'qr',
      qrCodeValue: 'curated-stop-1'
    }
  ]
};

const packPayload = {
  name: 'New pack',
  description: 'Editorial pack',
  promise: 'Ready for guides',
  badges: ['Editorial'],
  practicalNotes: 'Stay close to the group.',
  image: '',
  featured: false,
  sortOrder: 2,
  status: 'draft',
  routes: [{ routeId: 'route-1', role: 'primary', reason: 'Primary', order: 1 }]
};

test.beforeEach(() => {
  writeFixture(makeFixture());
});

test('regular user cannot access guide workspace or editorial endpoints', async (t) => {
  const baseUrl = await startServer(t);
  const userToken = makeToken('user-1');

  const guideResponse = await requestJson(baseUrl, '/api/route-packs/guide', {
    headers: { 'x-auth-token': userToken }
  });
  const routeResponse = await requestJson(baseUrl, '/api/routes/admin', {
    method: 'POST',
    headers: { 'x-auth-token': userToken },
    body: routePayload
  });

  assert.equal(guideResponse.response.status, 403);
  assert.equal(guideResponse.data.msg, 'Guide workspace access required');
  assert.equal(routeResponse.response.status, 403);
  assert.equal(routeResponse.data.msg, 'Editorial access required');
});

test('guide can open guide workspace but cannot edit routes or packs', async (t) => {
  const baseUrl = await startServer(t);
  const guideToken = makeToken('guide-1');

  const guideResponse = await requestJson(baseUrl, '/api/route-packs/guide', {
    headers: { 'x-auth-token': guideToken }
  });
  const packResponse = await requestJson(baseUrl, '/api/route-packs/admin', {
    method: 'POST',
    headers: { 'x-auth-token': guideToken },
    body: packPayload
  });
  const routeResponse = await requestJson(baseUrl, '/api/routes/admin', {
    method: 'POST',
    headers: { 'x-auth-token': guideToken },
    body: routePayload
  });

  assert.equal(guideResponse.response.status, 200);
  assert.equal(guideResponse.data.length, 1);
  assert.equal(packResponse.response.status, 403);
  assert.equal(packResponse.data.msg, 'Editorial access required');
  assert.equal(routeResponse.response.status, 403);
  assert.equal(routeResponse.data.msg, 'Editorial access required');
});

test('curator can access guide workspace and editorial CRUD but not role management', async (t) => {
  const baseUrl = await startServer(t);
  const curatorToken = makeToken('curator-1');

  const guideResponse = await requestJson(baseUrl, '/api/route-packs/guide', {
    headers: { 'x-auth-token': curatorToken }
  });
  const routeResponse = await requestJson(baseUrl, '/api/routes/admin', {
    method: 'POST',
    headers: { 'x-auth-token': curatorToken },
    body: routePayload
  });
  const roleResponse = await requestJson(baseUrl, '/api/users/user-1/role', {
    method: 'PATCH',
    headers: { 'x-auth-token': curatorToken },
    body: { role: 'Guide' }
  });

  assert.equal(guideResponse.response.status, 200);
  assert.equal(routeResponse.response.status, 201);
  assert.equal(roleResponse.response.status, 403);
  assert.equal(roleResponse.data.msg, 'Administrator access required');
});

test('administrator can assign roles through the dedicated endpoint', async (t) => {
  const baseUrl = await startServer(t);
  const adminToken = makeToken('admin-1');

  const roleResponse = await requestJson(baseUrl, '/api/users/user-1/role', {
    method: 'PATCH',
    headers: { 'x-auth-token': adminToken },
    body: { role: 'Guide' }
  });
  const profileResponse = await requestJson(baseUrl, '/api/users/me', {
    headers: { 'x-auth-token': makeToken('user-1') }
  });

  assert.equal(roleResponse.response.status, 200);
  assert.equal(roleResponse.data.user.role, 'Guide');
  assert.equal(profileResponse.response.status, 200);
  assert.equal(profileResponse.data.role, 'Guide');
});

test('legacy users without a stored role normalize to User and stay blocked from guide workspace', async (t) => {
  const baseUrl = await startServer(t);
  const legacyToken = makeToken('legacy-1');

  const profileResponse = await requestJson(baseUrl, '/api/users/me', {
    headers: { 'x-auth-token': legacyToken }
  });
  const guideResponse = await requestJson(baseUrl, '/api/route-packs/guide', {
    headers: { 'x-auth-token': legacyToken }
  });

  assert.equal(profileResponse.response.status, 200);
  assert.equal(profileResponse.data.role, 'User');
  assert.equal(guideResponse.response.status, 403);
  assert.equal(guideResponse.data.msg, 'Guide workspace access required');
});
