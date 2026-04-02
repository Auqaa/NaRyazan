const crypto = require('crypto');
const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { buildGuidePackDetail, buildGuidePackListItem } = require('../services/guideMaterials');
const { getDb, withDb } = require('../storage/fileDb');

const router = express.Router();
const makeId = () => crypto.randomUUID();

const sanitizeText = (value) => String(value || '').trim();

const normalizePackRoute = (entry, index) => ({
  routeId: sanitizeText(entry.routeId),
  role: entry.role === 'alternative' ? 'alternative' : 'primary',
  reason: sanitizeText(entry.reason),
  order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : index + 1
});

const sortPackRoutes = (routes = []) => routes.slice().sort((left, right) => (left.order || 0) - (right.order || 0));

const normalizePackPayload = (payload, existingPack = {}) => ({
  ...existingPack,
  name: sanitizeText(payload.name),
  description: sanitizeText(payload.description),
  promise: sanitizeText(payload.promise),
  badges: Array.isArray(payload.badges) ? payload.badges.map((badge) => sanitizeText(badge)).filter(Boolean).slice(0, 4) : [],
  practicalNotes: sanitizeText(payload.practicalNotes),
  image: sanitizeText(payload.image),
  featured: Boolean(payload.featured),
  sortOrder: Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0,
  status: payload.status === 'published' ? 'published' : 'draft',
  routes: sortPackRoutes(Array.isArray(payload.routes) ? payload.routes.map(normalizePackRoute) : [])
});

const comparePacks = (left, right) => {
  if (Boolean(left.featured) !== Boolean(right.featured)) {
    return left.featured ? -1 : 1;
  }

  if ((left.sortOrder || 0) !== (right.sortOrder || 0)) {
    return (left.sortOrder || 0) - (right.sortOrder || 0);
  }

  return String(left.name || '').localeCompare(String(right.name || ''), 'ru');
};

const inspectPack = (pack, db) => {
  const routesById = new Map((db.routes || []).map((route) => [route._id, route]));
  const entries = sortPackRoutes(Array.isArray(pack.routes) ? pack.routes.map(normalizePackRoute) : []);
  const issues = [];
  const seenRouteIds = new Set();
  const seenOrders = new Set();

  entries.forEach((entry) => {
    if (seenRouteIds.has(entry.routeId)) {
      issues.push(`Дублируется маршрут ${entry.routeId}`);
    }
    seenRouteIds.add(entry.routeId);

    if (seenOrders.has(entry.order)) {
      issues.push(`Дублируется порядок варианта ${entry.order}`);
    }
    seenOrders.add(entry.order);
  });

  const resolvedEntries = entries.map((entry) => ({
    ...entry,
    exists: routesById.has(entry.routeId)
  }));

  resolvedEntries
    .filter((entry) => !entry.exists)
    .forEach((entry) => {
      issues.push(`Маршрут не найден: ${entry.routeId}`);
    });

  const validEntries = resolvedEntries.filter((entry) => entry.exists);
  const primaryEntries = validEntries.filter((entry) => entry.role === 'primary');
  const alternativeEntries = validEntries.filter((entry) => entry.role === 'alternative');

  if (primaryEntries.length === 0) {
    issues.push('Нет доступного рекомендуемого маршрута');
  }

  if (primaryEntries.length > 1) {
    issues.push('Больше одного primary-маршрута');
  }

  if (alternativeEntries.length > 2) {
    issues.push('Больше двух альтернативных маршрутов');
  }

  if (!validEntries.length) {
    issues.push('Нет доступных маршрутов для публикации');
  }

  const isPublishable =
    pack.status === 'published' &&
    primaryEntries.length === 1 &&
    alternativeEntries.length <= 2 &&
    validEntries.length > 0 &&
    !issues.some((issue) => issue.startsWith('Дублируется'));

  return {
    isPublishable,
    issues: Array.from(new Set(issues)),
    validRoutes: validEntries.map(({ routeId, role, reason, order }) => ({
      routeId,
      role,
      reason,
      order
    }))
  };
};

const serializePack = (pack) => ({
  _id: pack._id,
  name: pack.name,
  description: pack.description,
  promise: pack.promise,
  badges: pack.badges || [],
  practicalNotes: pack.practicalNotes || '',
  image: pack.image || '',
  featured: Boolean(pack.featured),
  sortOrder: Number(pack.sortOrder || 0),
  status: pack.status === 'published' ? 'published' : 'draft',
  routes: sortPackRoutes(pack.routes || []).map((entry, index) => normalizePackRoute(entry, index)),
  createdAt: pack.createdAt || null,
  updatedAt: pack.updatedAt || null
});

const collectGuideVisiblePacks = (db) =>
  (db.routePacks || [])
    .map((pack) => {
      const serializedPack = serializePack(pack);
      const inspection = inspectPack(serializedPack, db);

      if (!inspection.isPublishable) {
        return null;
      }

      return {
        pack: serializedPack,
        inspection
      };
    })
    .filter(Boolean)
    .sort((left, right) => comparePacks(left.pack, right.pack));

const validateRoutePackPayload = [
  body('name').isString().trim().isLength({ min: 2, max: 120 }),
  body('description').isString().trim().isLength({ min: 2, max: 500 }),
  body('promise').isString().trim().isLength({ min: 2, max: 280 }),
  body('practicalNotes').optional({ checkFalsy: true }).isString().isLength({ max: 400 }),
  body('image').optional({ checkFalsy: true }).isString(),
  body('featured').optional().isBoolean(),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('status').optional().isIn(['draft', 'published']),
  body('badges').optional().isArray({ max: 4 }),
  body('badges.*').optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 40 }),
  body('routes').isArray({ min: 1, max: 3 }),
  body('routes.*.routeId').isString().trim().isLength({ min: 1 }),
  body('routes.*.role').isIn(['primary', 'alternative']),
  body('routes.*.reason').optional({ checkFalsy: true }).isString().isLength({ max: 280 }),
  body('routes.*.order').optional().isInt({ min: 1 }),
  body('routes').custom((entries) => {
    const routeIds = new Set();
    const orders = new Set();
    let primaryCount = 0;
    let alternativeCount = 0;

    entries.forEach((entry, index) => {
      const routeId = sanitizeText(entry.routeId);
      const order = Number.isFinite(Number(entry.order)) ? Number(entry.order) : index + 1;

      if (routeIds.has(routeId)) {
        throw new Error('Route pack cannot reference the same route twice');
      }
      routeIds.add(routeId);

      if (orders.has(order)) {
        throw new Error('Route pack option order must be unique');
      }
      orders.add(order);

      if (entry.role === 'primary') primaryCount += 1;
      if (entry.role === 'alternative') alternativeCount += 1;
    });

    if (primaryCount !== 1) {
      throw new Error('Route pack must contain exactly one primary route');
    }

    if (alternativeCount > 2) {
      throw new Error('Route pack can contain at most two alternatives');
    }

    return true;
  }),
  body('image').custom((value) => {
    if (sanitizeText(value).length > 4_000_000) {
      throw new Error('Pack image is too large');
    }
    return true;
  })
];

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const routePacks = (db.routePacks || [])
      .map((pack) => {
        const serializedPack = serializePack(pack);
        const inspection = inspectPack(serializedPack, db);

        if (!inspection.isPublishable) {
          return null;
        }

        return {
          ...serializedPack,
          routes: inspection.validRoutes
        };
      })
      .filter(Boolean)
      .sort(comparePacks);

    res.json(routePacks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to load route packs' });
  }
});

router.get('/guide', auth, auth.requireGuideWorkspaceAccess, async (req, res) => {
  try {
    const db = await getDb();
    const routePacks = collectGuideVisiblePacks(db).map(({ pack, inspection }) => buildGuidePackListItem(pack, inspection, db));

    res.json(routePacks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to load guide route packs' });
  }
});

router.get('/guide/:id', auth, auth.requireGuideWorkspaceAccess, async (req, res) => {
  try {
    const db = await getDb();
    const routePack = collectGuideVisiblePacks(db).find(({ pack }) => pack._id === req.params.id);

    if (!routePack) {
      return res.status(404).json({ msg: 'Guide route pack not found' });
    }

    res.json(buildGuidePackDetail(routePack.pack, routePack.inspection, db));
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to load guide route pack' });
  }
});

router.get('/admin', auth, auth.requireEditorialRole, async (req, res) => {
  try {
    const db = await getDb();
    const routePacks = (db.routePacks || [])
      .map((pack) => {
        const serializedPack = serializePack(pack);
        const inspection = inspectPack(serializedPack, db);

        return {
          ...serializedPack,
          validation: {
            isPublishable: inspection.isPublishable,
            issues: inspection.issues
          }
        };
      })
      .sort(comparePacks);

    res.json(routePacks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to load route packs for admin' });
  }
});

router.post('/admin', auth, auth.requireEditorialRole, validateRoutePackPayload, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const db = await getDb();
    const nextPack = normalizePackPayload(req.body, {
      _id: makeId(),
      createdAt: new Date().toISOString()
    });
    nextPack.updatedAt = new Date().toISOString();

    const missingRouteIds = nextPack.routes
      .map((entry) => entry.routeId)
      .filter((routeId) => !db.routes.some((route) => route._id === routeId));

    if (missingRouteIds.length) {
      return res.status(400).json({ msg: `Linked routes not found: ${missingRouteIds.join(', ')}` });
    }

    await withDb(async (innerDb) => {
      innerDb.routePacks.push(nextPack);
    });

    const updatedDb = await getDb();
    const inspection = inspectPack(nextPack, updatedDb);

    res.status(201).json({
      ...serializePack(nextPack),
      validation: {
        isPublishable: inspection.isPublishable,
        issues: inspection.issues
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to create route pack' });
  }
});

router.put('/admin/:id', auth, auth.requireEditorialRole, validateRoutePackPayload, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const db = await getDb();
    const existingPack = (db.routePacks || []).find((pack) => pack._id === req.params.id);

    if (!existingPack) {
      return res.status(404).json({ msg: 'Route pack not found' });
    }

    const nextPack = normalizePackPayload(req.body, existingPack);
    nextPack._id = existingPack._id;
    nextPack.createdAt = existingPack.createdAt || new Date().toISOString();
    nextPack.updatedAt = new Date().toISOString();

    const missingRouteIds = nextPack.routes
      .map((entry) => entry.routeId)
      .filter((routeId) => !db.routes.some((route) => route._id === routeId));

    if (missingRouteIds.length) {
      return res.status(400).json({ msg: `Linked routes not found: ${missingRouteIds.join(', ')}` });
    }

    await withDb(async (innerDb) => {
      innerDb.routePacks = innerDb.routePacks.map((pack) => (pack._id === existingPack._id ? nextPack : pack));
    });

    const updatedDb = await getDb();
    const inspection = inspectPack(nextPack, updatedDb);

    res.json({
      ...serializePack(nextPack),
      validation: {
        isPublishable: inspection.isPublishable,
        issues: inspection.issues
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to update route pack' });
  }
});

router.delete('/admin/:id', auth, auth.requireEditorialRole, async (req, res) => {
  try {
    const db = await getDb();
    const existingPack = (db.routePacks || []).find((pack) => pack._id === req.params.id);

    if (!existingPack) {
      return res.status(404).json({ msg: 'Route pack not found' });
    }

    await withDb(async (innerDb) => {
      innerDb.routePacks = innerDb.routePacks.filter((pack) => pack._id !== existingPack._id);
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to delete route pack' });
  }
});

module.exports = router;
