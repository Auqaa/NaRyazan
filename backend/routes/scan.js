const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { extractQrCandidates, normalizeQrValueForMatch } = require('../services/qrCodes');
const { getDb, withDb } = require('../storage/fileDb');

const findPointByQrValue = (points, rawInput) => {
  const candidates = extractQrCandidates(rawInput);
  if (!candidates.length) return null;

  return (
    points.find((point) =>
      candidates.some((candidate) => normalizeQrValueForMatch(point.qrCodeValue) === candidate)
    ) || null
  );
};

const completedRoutesForUser = (db, scannedPointIds) =>
  (db.routes || [])
    .filter((route) => (route.points || []).length > 0)
    .filter((route) => (route.points || []).every((pointId) => scannedPointIds.includes(pointId)))
    .map((route) => ({ _id: route._id, name: route.name }));

router.post('/', auth, async (req, res) => {
  const { qrValue } = req.body || {};
  const normalizedQrValue = normalizeQrValueForMatch(qrValue);

  try {
    const db = await getDb();
    const point = findPointByQrValue(db.points || [], qrValue);
    if (!point) return res.status(404).json({ msg: 'Invalid QR code' });

    const user = db.users.find((item) => item._id === req.user.id);
    if (!user) return res.status(401).json({ msg: 'User not found' });

    let responsePayload = null;

    await withDb(async (innerDb) => {
      const innerUser = innerDb.users.find((item) => item._id === req.user.id);
      const innerPoint = innerDb.points.find((item) => item._id === point._id);
      if (!innerUser || !innerPoint) return;

      innerUser.scannedPoints = Array.isArray(innerUser.scannedPoints) ? innerUser.scannedPoints : [];
      innerUser.completedRoutes = Array.isArray(innerUser.completedRoutes) ? innerUser.completedRoutes : [];

      const previousCompletedRouteIds = new Set(innerUser.completedRoutes);
      const alreadyScanned = innerUser.scannedPoints.includes(innerPoint._id);
      const rewardDelta = alreadyScanned ? 0 : Number(innerPoint.reward || 0);

      if (!alreadyScanned) {
        innerUser.balance += rewardDelta;
        innerUser.scannedPoints.push(innerPoint._id);
      }

      const completedRoutes = completedRoutesForUser(innerDb, innerUser.scannedPoints);
      const completedRouteIds = completedRoutes.map((route) => route._id);
      innerUser.completedRoutes = Array.from(new Set([...innerUser.completedRoutes, ...completedRouteIds]));

      responsePayload = {
        success: true,
        scanStatus: alreadyScanned ? 'duplicate' : 'fresh',
        freshScan: !alreadyScanned,
        alreadyScanned,
        rewardDelta,
        reward: rewardDelta,
        newBalance: innerUser.balance,
        point: innerPoint,
        newlyCompletedRoutes: completedRoutes.filter((route) => !previousCompletedRouteIds.has(route._id)),
        normalizedQrValue
      };
    });

    if (!responsePayload) {
      return res.status(500).json({ msg: 'Failed to process scan' });
    }

    res.json(responsePayload);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
