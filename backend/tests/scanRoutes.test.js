const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const jwt = require('jsonwebtoken');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-routes-'));
const dbPath = path.join(tempDir, 'db.json');
const templatePath = path.join(tempDir, 'db.template.json');

process.env.JWT_SECRET = 'scan-routes-test-secret';
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
    },
    {
      _id: 'user-1',
      name: 'Walker',
      email: 'walker@test.local',
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
      points: ['point-1'],
      totalReward: 25,
      image: '',
      city: 'Ryazan',
      themes: ['history']
    }
  ],
  routePacks: [],
  points: [
    {
      _id: 'point-1',
      routeId: 'route-1',
      name: 'Kremlin stop',
      description: 'Old center',
      address: 'Square',
      lat: 54.63,
      lng: 39.75,
      qrCodeValue: 'rq_museum_kremlin_01',
      reward: 25,
      order: 1,
      facts: [],
      guideText: '',
      guideAudioUrl: '',
      waypointType: 'qr'
    }
  ],
  rewards: [],
  optionalStops: [],
  scans: [],
  ...overrides
});

const adminToken = jwt.sign({ user: { id: 'admin-1' } }, process.env.JWT_SECRET, { expiresIn: '1h' });
const userToken = jwt.sign({ user: { id: 'user-1' } }, process.env.JWT_SECRET, { expiresIn: '1h' });

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

test('scan accepts trimmed mixed-case qr values and returns the richer fresh contract', async (t) => {
  const baseUrl = await startServer(t);
  const { response, data } = await requestJson(baseUrl, '/api/scan', {
    method: 'POST',
    headers: { 'x-auth-token': userToken },
    body: { qrValue: '  RQ_MUSEUM_KREMLIN_01  ' }
  });

  assert.equal(response.status, 200);
  assert.equal(data.scanStatus, 'fresh');
  assert.equal(data.freshScan, true);
  assert.equal(data.alreadyScanned, false);
  assert.equal(data.rewardDelta, 25);
  assert.equal(data.reward, 25);
  assert.equal(data.newBalance, 25);
  assert.equal(data.normalizedQrValue, 'rq_museum_kremlin_01');
  assert.equal(data.point._id, 'point-1');
});

test('scan resolves URL payloads and replay stays idempotent', async (t) => {
  const baseUrl = await startServer(t);
  const firstScan = await requestJson(baseUrl, '/api/scan', {
    method: 'POST',
    headers: { 'x-auth-token': userToken },
    body: { qrValue: 'https://example.test/scan?qrValue=RQ_MUSEUM_KREMLIN_01' }
  });
  const secondScan = await requestJson(baseUrl, '/api/scan', {
    method: 'POST',
    headers: { 'x-auth-token': userToken },
    body: { qrValue: 'rq_museum_kremlin_01' }
  });

  assert.equal(firstScan.response.status, 200);
  assert.equal(firstScan.data.scanStatus, 'fresh');
  assert.equal(secondScan.response.status, 200);
  assert.equal(secondScan.data.scanStatus, 'duplicate');
  assert.equal(secondScan.data.freshScan, false);
  assert.equal(secondScan.data.alreadyScanned, true);
  assert.equal(secondScan.data.rewardDelta, 0);
  assert.equal(secondScan.data.reward, 0);
  assert.equal(secondScan.data.newBalance, 25);
});

test('scan returns newly completed routes when the last checkpoint is scanned', async (t) => {
  const baseUrl = await startServer(t);
  const { response, data } = await requestJson(baseUrl, '/api/scan', {
    method: 'POST',
    headers: { 'x-auth-token': userToken },
    body: { qrValue: 'rq_museum_kremlin_01' }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(data.newlyCompletedRoutes, [{ _id: 'route-1', name: 'History Walk' }]);
});

test('invalid qr values get a 404 domain response', async (t) => {
  const baseUrl = await startServer(t);
  const { response, data } = await requestJson(baseUrl, '/api/scan', {
    method: 'POST',
    headers: { 'x-auth-token': userToken },
    body: { qrValue: 'not-a-real-code' }
  });

  assert.equal(response.status, 404);
  assert.equal(data.msg, 'Invalid QR code');
});

test('route admin rejects qr values that differ only by case', async (t) => {
  const baseUrl = await startServer(t);
  const { response, data } = await requestJson(baseUrl, '/api/routes/admin', {
    method: 'POST',
    headers: { 'x-auth-token': adminToken },
    body: {
      name: 'Case check',
      description: 'Canonical duplicates should fail',
      category: 'History',
      image: '',
      waypoints: [
        {
          name: 'First QR',
          description: '',
          address: '',
          lat: 54.631,
          lng: 39.751,
          order: 1,
          waypointType: 'qr',
          qrCodeValue: 'CASE_VALUE_01'
        },
        {
          name: 'Second QR',
          description: '',
          address: '',
          lat: 54.632,
          lng: 39.752,
          order: 2,
          waypointType: 'qr',
          qrCodeValue: 'case_value_01'
        }
      ]
    }
  });

  assert.equal(response.status, 400);
  assert.equal(data.msg, 'Duplicate qrCodeValue inside route: case_value_01');
});
