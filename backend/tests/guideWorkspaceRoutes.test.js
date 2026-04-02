const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const jwt = require('jsonwebtoken');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guide-workspace-'));
const dbPath = path.join(tempDir, 'db.json');
const templatePath = path.join(tempDir, 'db.template.json');

process.env.JWT_SECRET = 'guide-workspace-test-secret';
process.env.FILE_DB_PATH = dbPath;
process.env.FILE_DB_TEMPLATE_PATH = templatePath;

const { resetDbCache } = require('../storage/fileDb');
const app = require('../app');

const makeFixture = (overrides = {}) => ({
  users: [
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
        email: { verified: true, pendingCode: null, requestedAt: null, verifiedAt: '2026-04-02T12:00:00.000Z' },
        phone: { verified: false, pendingCode: null, requestedAt: null, verifiedAt: null }
      },
      createdAt: '2026-04-02T12:00:00.000Z'
    }
  ],
  routes: [
    {
      _id: 'route-primary',
      name: 'Primary route',
      description: 'Main live route',
      category: 'History',
      points: ['point-guide', 'point-facts', 'point-description'],
      totalReward: 30,
      image: '',
      city: 'Ryazan',
      themes: ['history']
    },
    {
      _id: 'route-alternative',
      name: 'Alternative route',
      description: 'Backup route',
      category: 'Parks',
      points: ['point-alt'],
      totalReward: 10,
      image: '',
      city: 'Ryazan',
      themes: ['parks']
    },
    {
      _id: 'route-secondary',
      name: 'Secondary route',
      description: 'Another scenario',
      category: 'Popular',
      points: ['point-secondary'],
      totalReward: 12,
      image: '',
      city: 'Ryazan',
      themes: ['popular']
    }
  ],
  routePacks: [
    {
      _id: 'pack-featured',
      name: 'Featured pack',
      description: 'First choice for guides',
      promise: 'Best first impression',
      badges: ['Featured'],
      practicalNotes: 'Start before noon and keep the pace steady.',
      image: '',
      featured: true,
      sortOrder: 3,
      status: 'published',
      routes: [
        { routeId: 'route-primary', role: 'primary', reason: 'Best structure', order: 1 },
        { routeId: 'route-alternative', role: 'alternative', reason: 'Weather fallback', order: 2 }
      ]
    },
    {
      _id: 'pack-draft',
      name: 'Draft pack',
      description: 'Should stay hidden',
      promise: 'Not ready',
      badges: [],
      practicalNotes: '',
      image: '',
      featured: false,
      sortOrder: 1,
      status: 'draft',
      routes: [{ routeId: 'route-primary', role: 'primary', reason: 'Draft', order: 1 }]
    },
    {
      _id: 'pack-broken',
      name: 'Broken pack',
      description: 'Should stay hidden',
      promise: 'Broken route link',
      badges: [],
      practicalNotes: '',
      image: '',
      featured: false,
      sortOrder: 1,
      status: 'published',
      routes: [{ routeId: 'missing-route', role: 'primary', reason: 'Missing', order: 1 }]
    },
    {
      _id: 'pack-secondary',
      name: 'Secondary pack',
      description: 'Second valid scenario',
      promise: 'Quick backup option',
      badges: [],
      practicalNotes: 'Shorter tour for tighter schedules.',
      image: '',
      featured: false,
      sortOrder: 1,
      status: 'published',
      routes: [{ routeId: 'route-secondary', role: 'primary', reason: 'Short route', order: 1 }]
    }
  ],
  points: [
    {
      _id: 'point-guide',
      routeId: 'route-primary',
      name: 'Guide-ready stop',
      description: 'General description',
      address: 'Address 1',
      lat: 54.631,
      lng: 39.751,
      qrCodeValue: 'guide-stop-1',
      reward: 10,
      order: 1,
      guideText: 'Dedicated guide narrative.',
      guideAudioUrl: '/media/guide-ready.mp3',
      facts: [{ question: 'Ignored question', answer: 'Ignored answer' }],
      waypointType: 'regular'
    },
    {
      _id: 'point-facts',
      routeId: 'route-primary',
      name: 'Facts fallback stop',
      description: 'Fallback description',
      address: 'Address 2',
      lat: 54.632,
      lng: 39.752,
      qrCodeValue: 'guide-stop-2',
      reward: 10,
      order: 2,
      guideText: '',
      guideAudioUrl: '',
      facts: [{ question: 'Key fact', answer: 'Use this fact instead of guide text.' }],
      waypointType: 'regular'
    },
    {
      _id: 'point-description',
      routeId: 'route-primary',
      name: 'Description fallback stop',
      description: 'Use the plain description as the last fallback.',
      address: 'Address 3',
      lat: 54.633,
      lng: 39.753,
      qrCodeValue: 'guide-stop-3',
      reward: 10,
      order: 3,
      guideText: '',
      guideAudioUrl: '',
      facts: [],
      waypointType: 'qr'
    },
    {
      _id: 'point-alt',
      routeId: 'route-alternative',
      name: 'Alternative stop',
      description: 'Alternative stop description',
      address: 'Alt address',
      lat: 54.634,
      lng: 39.754,
      qrCodeValue: 'alt-stop',
      reward: 10,
      order: 1,
      guideText: 'Alternative narrative.',
      guideAudioUrl: '',
      facts: [],
      waypointType: 'regular'
    },
    {
      _id: 'point-secondary',
      routeId: 'route-secondary',
      name: 'Secondary stop',
      description: 'Secondary stop description',
      address: 'Secondary address',
      lat: 54.635,
      lng: 39.755,
      qrCodeValue: 'secondary-stop',
      reward: 12,
      order: 1,
      guideText: 'Secondary narrative.',
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

const guideToken = jwt.sign({ user: { id: 'guide-1' } }, process.env.JWT_SECRET, { expiresIn: '1h' });

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

test('guide list returns only published valid packs and keeps featured ordering', async (t) => {
  const baseUrl = await startServer(t);
  const { response, data } = await requestJson(baseUrl, '/api/route-packs/guide', {
    headers: { 'x-auth-token': guideToken }
  });

  assert.equal(response.status, 200);
  assert.deepEqual(
    data.map((pack) => pack._id),
    ['pack-featured', 'pack-secondary']
  );
  assert.equal(data[0].defaultVariantRouteId, 'route-primary');
  assert.deepEqual(
    data[0].variants.map((variant) => variant.routeId),
    ['route-primary', 'route-alternative']
  );
});

test('guide detail defaults to the primary variant and keeps alternatives in stable order', async (t) => {
  const baseUrl = await startServer(t);
  const { response, data } = await requestJson(baseUrl, '/api/route-packs/guide/pack-featured', {
    headers: { 'x-auth-token': guideToken }
  });

  assert.equal(response.status, 200);
  assert.equal(data.defaultVariantRouteId, 'route-primary');
  assert.deepEqual(
    data.variants.map((variant) => [variant.routeId, variant.role]),
    [
      ['route-primary', 'primary'],
      ['route-alternative', 'alternative']
    ]
  );
  assert.equal(data.variants[0].stops.length, 3);
});

test('guide detail exposes layered stop materials with gap markers', async (t) => {
  const baseUrl = await startServer(t);
  const { response, data } = await requestJson(baseUrl, '/api/route-packs/guide/pack-featured', {
    headers: { 'x-auth-token': guideToken }
  });

  assert.equal(response.status, 200);

  const [guideStop, factsStop, descriptionStop] = data.variants[0].stops;

  assert.equal(guideStop.materialSource, 'guideText');
  assert.equal(guideStop.hasGuideGap, false);
  assert.deepEqual(
    guideStop.materialBlocks.map((block) => block.type),
    ['guideText', 'audio']
  );

  assert.equal(factsStop.materialSource, 'facts');
  assert.equal(factsStop.hasGuideGap, true);
  assert.deepEqual(
    factsStop.materialBlocks.map((block) => block.type),
    ['facts']
  );
  assert.equal(factsStop.facts[0].answer, 'Use this fact instead of guide text.');

  assert.equal(descriptionStop.materialSource, 'description');
  assert.equal(descriptionStop.hasGuideGap, true);
  assert.deepEqual(
    descriptionStop.materialBlocks.map((block) => block.type),
    ['description']
  );
  assert.equal(descriptionStop.materialBlocks[0].text, 'Use the plain description as the last fallback.');
});

test('guide detail returns 404 for invalid or unavailable packs', async (t) => {
  const baseUrl = await startServer(t);
  const brokenPack = await requestJson(baseUrl, '/api/route-packs/guide/pack-broken', {
    headers: { 'x-auth-token': guideToken }
  });
  const draftPack = await requestJson(baseUrl, '/api/route-packs/guide/pack-draft', {
    headers: { 'x-auth-token': guideToken }
  });

  assert.equal(brokenPack.response.status, 404);
  assert.equal(brokenPack.data.msg, 'Guide route pack not found');
  assert.equal(draftPack.response.status, 404);
  assert.equal(draftPack.data.msg, 'Guide route pack not found');
});
