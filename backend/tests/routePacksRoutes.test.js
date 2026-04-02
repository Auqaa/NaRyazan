const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const jwt = require('jsonwebtoken');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-packs-'));
const dbPath = path.join(tempDir, 'db.json');
const templatePath = path.join(tempDir, 'db.template.json');

process.env.JWT_SECRET = 'route-packs-test-secret';
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
        email: { verified: true, pendingCode: null, requestedAt: null, verifiedAt: '2026-04-01T12:00:00.000Z' },
        phone: { verified: false, pendingCode: null, requestedAt: null, verifiedAt: null }
      },
      createdAt: '2026-04-01T12:00:00.000Z'
    }
  ],
  routes: [
    {
      _id: 'route-1',
      name: 'History Walk',
      description: 'Main historical route',
      category: 'History',
      points: [],
      totalReward: 30,
      image: '',
      city: 'Ryazan',
      themes: ['history']
    },
    {
      _id: 'route-2',
      name: 'Park Walk',
      description: 'Parks and river',
      category: 'Parks',
      points: [],
      totalReward: 20,
      image: '',
      city: 'Ryazan',
      themes: ['parks', 'water']
    },
    {
      _id: 'route-3',
      name: 'Evening Walk',
      description: 'Short evening route',
      category: 'Popular',
      points: [],
      totalReward: 15,
      image: '',
      city: 'Ryazan',
      themes: ['popular']
    }
  ],
  routePacks: [],
  points: [],
  rewards: [],
  optionalStops: [],
  scans: [],
  ...overrides
});

const adminToken = jwt.sign({ user: { id: 'admin-1' } }, process.env.JWT_SECRET, { expiresIn: '1h' });

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

test.beforeEach(() => {
  writeFixture(makeFixture());
});

test('public list hides draft and broken packs and keeps featured packs first', async (t) => {
  writeFixture(
    makeFixture({
      routePacks: [
        {
          _id: 'pack-featured',
          name: 'Featured',
          description: 'Featured pack',
          promise: 'A strong first choice',
          badges: ['Featured'],
          practicalNotes: '',
          image: '',
          featured: true,
          sortOrder: 3,
          status: 'published',
          routes: [
            { routeId: 'route-2', role: 'primary', reason: 'Best fit', order: 1 },
            { routeId: 'route-1', role: 'alternative', reason: 'Another option', order: 2 }
          ]
        },
        {
          _id: 'pack-draft',
          name: 'Draft',
          description: 'Draft pack',
          promise: 'Not public yet',
          badges: [],
          practicalNotes: '',
          image: '',
          featured: false,
          sortOrder: 1,
          status: 'draft',
          routes: [{ routeId: 'route-1', role: 'primary', reason: 'Draft route', order: 1 }]
        },
        {
          _id: 'pack-broken',
          name: 'Broken',
          description: 'Broken pack',
          promise: 'Missing primary route',
          badges: [],
          practicalNotes: '',
          image: '',
          featured: true,
          sortOrder: 1,
          status: 'published',
          routes: [{ routeId: 'missing-route', role: 'primary', reason: 'Missing', order: 1 }]
        },
        {
          _id: 'pack-secondary',
          name: 'Secondary',
          description: 'Second pack',
          promise: 'Another public option',
          badges: [],
          practicalNotes: '',
          image: '',
          featured: false,
          sortOrder: 1,
          status: 'published',
          routes: [{ routeId: 'route-3', role: 'primary', reason: 'Evening route', order: 1 }]
        }
      ]
    })
  );

  const baseUrl = await startServer(t);
  const { response, data } = await requestJson(baseUrl, '/api/route-packs');

  assert.equal(response.status, 200);
  assert.deepEqual(
    data.map((pack) => pack._id),
    ['pack-featured', 'pack-secondary']
  );
  assert.deepEqual(
    data[0].routes.map((entry) => entry.routeId),
    ['route-2', 'route-1']
  );
});

test('admin create rejects payload without a primary route', async (t) => {
  const baseUrl = await startServer(t);
  const { response, data } = await requestJson(baseUrl, '/api/route-packs/admin', {
    method: 'POST',
    headers: { 'x-auth-token': adminToken },
    body: {
      name: 'No primary',
      description: 'Broken structure',
      promise: 'Should fail',
      status: 'draft',
      featured: false,
      sortOrder: 1,
      badges: [],
      practicalNotes: '',
      image: '',
      routes: [
        { routeId: 'route-1', role: 'alternative', reason: 'Alt only', order: 1 },
        { routeId: 'route-2', role: 'alternative', reason: 'Alt only', order: 2 }
      ]
    }
  });

  assert.equal(response.status, 400);
  assert.ok(Array.isArray(data.errors));
});

test('admin create rejects duplicate route references inside a pack', async (t) => {
  const baseUrl = await startServer(t);
  const { response, data } = await requestJson(baseUrl, '/api/route-packs/admin', {
    method: 'POST',
    headers: { 'x-auth-token': adminToken },
    body: {
      name: 'Duplicate route',
      description: 'Broken structure',
      promise: 'Should fail',
      status: 'draft',
      featured: false,
      sortOrder: 1,
      badges: [],
      practicalNotes: '',
      image: '',
      routes: [
        { routeId: 'route-1', role: 'primary', reason: 'Primary', order: 1 },
        { routeId: 'route-1', role: 'alternative', reason: 'Duplicate', order: 2 }
      ]
    }
  });

  assert.equal(response.status, 400);
  assert.ok(Array.isArray(data.errors));
});

test('admin list marks published pack invalid after its primary route disappears', async (t) => {
  writeFixture(
    makeFixture({
      routePacks: [
        {
          _id: 'pack-stale',
          name: 'Stale pack',
          description: 'Should be hidden publicly after route removal',
          promise: 'Depends on route-1',
          badges: [],
          practicalNotes: '',
          image: '',
          featured: false,
          sortOrder: 1,
          status: 'published',
          routes: [
            { routeId: 'route-1', role: 'primary', reason: 'Main route', order: 1 },
            { routeId: 'route-2', role: 'alternative', reason: 'Backup route', order: 2 }
          ]
        }
      ]
    })
  );

  const staleFixture = makeFixture({
    routes: [
      {
        _id: 'route-2',
        name: 'Park Walk',
        description: 'Parks and river',
        category: 'Parks',
        points: [],
        totalReward: 20,
        image: '',
        city: 'Ryazan',
        themes: ['parks', 'water']
      }
    ],
    routePacks: [
      {
        _id: 'pack-stale',
        name: 'Stale pack',
        description: 'Should be hidden publicly after route removal',
        promise: 'Depends on route-1',
        badges: [],
        practicalNotes: '',
        image: '',
        featured: false,
        sortOrder: 1,
        status: 'published',
        routes: [
          { routeId: 'route-1', role: 'primary', reason: 'Main route', order: 1 },
          { routeId: 'route-2', role: 'alternative', reason: 'Backup route', order: 2 }
        ]
      }
    ]
  });

  writeFixture(staleFixture);

  const baseUrl = await startServer(t);
  const adminResult = await requestJson(baseUrl, '/api/route-packs/admin', {
    headers: { 'x-auth-token': adminToken }
  });
  const publicResult = await requestJson(baseUrl, '/api/route-packs');

  assert.equal(adminResult.response.status, 200);
  assert.equal(publicResult.response.status, 200);
  assert.equal(adminResult.data[0].validation.isPublishable, false);
  assert.ok(adminResult.data[0].validation.issues.some((issue) => issue.includes('route-1')));
  assert.equal(publicResult.data.length, 0);
});

test('admin delete removes a route pack', async (t) => {
  writeFixture(
    makeFixture({
      routePacks: [
        {
          _id: 'pack-delete-me',
          name: 'Delete me',
          description: 'Disposable pack',
          promise: 'Will be removed',
          badges: [],
          practicalNotes: '',
          image: '',
          featured: false,
          sortOrder: 1,
          status: 'draft',
          routes: [{ routeId: 'route-1', role: 'primary', reason: 'Primary', order: 1 }]
        }
      ]
    })
  );

  const baseUrl = await startServer(t);
  const deleteResult = await requestJson(baseUrl, '/api/route-packs/admin/pack-delete-me', {
    method: 'DELETE',
    headers: { 'x-auth-token': adminToken }
  });
  const listResult = await requestJson(baseUrl, '/api/route-packs/admin', {
    headers: { 'x-auth-token': adminToken }
  });

  assert.equal(deleteResult.response.status, 200);
  assert.equal(listResult.data.length, 0);
});
