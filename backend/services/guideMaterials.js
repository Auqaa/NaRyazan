const sanitizeText = (value) => String(value || '').trim();

const summarizeText = (value, maxLength = 160) => {
  const text = sanitizeText(value).replace(/\s+/g, ' ');
  if (!text || text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const normalizeFact = (fact) => {
  const question = sanitizeText(fact?.question);
  const answer = sanitizeText(fact?.answer);

  if (!question && !answer) {
    return null;
  }

  return {
    question,
    answer
  };
};

const estimateDistanceKm = (points) => {
  if (points.length < 2) return 0;

  const total = points.reduce((sum, point, index) => {
    if (index === 0) return sum;
    const previousPoint = points[index - 1];
    const dx = (Number(point.lat) - Number(previousPoint.lat)) * 111;
    const dy = (Number(point.lng) - Number(previousPoint.lng)) * 71;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  return Number((total * 1.18).toFixed(1));
};

const estimateDurationMinutes = (distanceKm) => Math.max(10, Math.round((distanceKm / 4.4) * 60));

const resolveRoutePoints = (route, db) => {
  const pointsById = new Map((db.points || []).map((point) => [point._id, point]));

  return (route.points || [])
    .map((pointId, index) => {
      const point = pointsById.get(pointId);
      if (!point) return null;

      return {
        ...point,
        order: Number.isFinite(Number(point.order)) ? Number(point.order) : index + 1
      };
    })
    .filter(Boolean)
    .sort((left, right) => (left.order || 0) - (right.order || 0));
};

const buildMaterialBlocks = (point) => {
  const guideText = sanitizeText(point.guideText);
  const guideAudioUrl = sanitizeText(point.guideAudioUrl);
  const facts = Array.isArray(point.facts) ? point.facts.map(normalizeFact).filter(Boolean) : [];
  const description = sanitizeText(point.description);
  const materialBlocks = [];
  let materialSource = 'none';

  if (guideText) {
    materialSource = 'guideText';
    materialBlocks.push({
      type: 'guideText',
      text: guideText
    });
  } else if (guideAudioUrl) {
    materialSource = 'guideAudio';
  } else if (facts.length) {
    materialSource = 'facts';
  } else if (description) {
    materialSource = 'description';
  }

  if (guideAudioUrl) {
    materialBlocks.push({
      type: 'audio',
      url: guideAudioUrl
    });
  }

  if (!guideText && facts.length) {
    materialBlocks.push({
      type: 'facts',
      items: facts
    });
  }

  if (!guideText && !facts.length && description) {
    materialBlocks.push({
      type: 'description',
      text: description
    });
  }

  const previewText =
    guideText ||
    (facts[0] ? summarizeText(`${facts[0].question} ${facts[0].answer}`, 160) : '') ||
    description;

  return {
    guideText,
    guideAudioUrl,
    facts,
    description,
    materialSource,
    hasGuideGap: !['guideText', 'guideAudio'].includes(materialSource),
    materialBlocks,
    previewText: summarizeText(previewText, 160)
  };
};

const buildGuideStop = (point) => {
  const materials = buildMaterialBlocks(point);

  return {
    _id: point._id,
    name: sanitizeText(point.name),
    order: Number.isFinite(Number(point.order)) ? Number(point.order) : 0,
    address: sanitizeText(point.address),
    description: materials.description,
    lat: Number(point.lat),
    lng: Number(point.lng),
    image: sanitizeText(point.image),
    waypointType: point.waypointType === 'qr' ? 'qr' : 'regular',
    qrCodeValue: sanitizeText(point.qrCodeValue),
    guideText: materials.guideText,
    guideAudioUrl: materials.guideAudioUrl,
    facts: materials.facts,
    materialSource: materials.materialSource,
    hasGuideGap: materials.hasGuideGap,
    materialBlocks: materials.materialBlocks,
    previewText: materials.previewText
  };
};

const buildGuideRouteSummary = (route, points) => {
  const distanceKm = route.distanceKm || estimateDistanceKm(points);
  const durationMinutes = route.durationMinutes || estimateDurationMinutes(distanceKm);
  const previewCenter =
    points.length > 0
      ? {
          lat: Number((points.reduce((sum, point) => sum + Number(point.lat), 0) / points.length).toFixed(6)),
          lng: Number((points.reduce((sum, point) => sum + Number(point.lng), 0) / points.length).toFixed(6))
        }
      : null;

  return {
    _id: route._id,
    name: sanitizeText(route.name),
    description: sanitizeText(route.description),
    image: sanitizeText(route.image),
    city: sanitizeText(route.city),
    themes: Array.isArray(route.themes) ? route.themes : [],
    pointCount: points.length,
    distanceKm,
    durationMinutes,
    previewCenter
  };
};

const buildGuideVariant = (entry, route, db, options = {}) => {
  const points = resolveRoutePoints(route, db);
  const stops = points.map((point) => buildGuideStop(point));
  const routeSummary = buildGuideRouteSummary(route, points);
  const fallbackStopCount = stops.filter((stop) => stop.hasGuideGap).length;

  return {
    routeId: route._id,
    role: entry.role,
    reason: sanitizeText(entry.reason),
    order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : 0,
    ...routeSummary,
    guideReadyStopCount: Math.max(0, stops.length - fallbackStopCount),
    fallbackStopCount,
    stops: options.includeStops ? stops : undefined
  };
};

const buildGuidePackListItem = (pack, inspection, db) => {
  const routesById = new Map((db.routes || []).map((route) => [route._id, route]));
  const variants = inspection.validRoutes
    .map((entry) => routesById.get(entry.routeId) && buildGuideVariant(entry, routesById.get(entry.routeId), db))
    .filter(Boolean)
    .sort((left, right) => (left.order || 0) - (right.order || 0));

  const defaultVariant = variants.find((variant) => variant.role === 'primary') || variants[0] || null;

  return {
    _id: pack._id,
    name: sanitizeText(pack.name),
    description: sanitizeText(pack.description),
    promise: sanitizeText(pack.promise),
    practicalNotesTeaser: summarizeText(pack.practicalNotes),
    badges: Array.isArray(pack.badges) ? pack.badges : [],
    image: sanitizeText(pack.image),
    featured: Boolean(pack.featured),
    sortOrder: Number(pack.sortOrder || 0),
    defaultVariantRouteId: defaultVariant?.routeId || null,
    variants
  };
};

const buildGuidePackDetail = (pack, inspection, db) => {
  const routesById = new Map((db.routes || []).map((route) => [route._id, route]));
  const variants = inspection.validRoutes
    .map((entry) => routesById.get(entry.routeId) && buildGuideVariant(entry, routesById.get(entry.routeId), db, { includeStops: true }))
    .filter(Boolean)
    .sort((left, right) => (left.order || 0) - (right.order || 0));

  const defaultVariant = variants.find((variant) => variant.role === 'primary') || variants[0] || null;

  return {
    _id: pack._id,
    name: sanitizeText(pack.name),
    description: sanitizeText(pack.description),
    promise: sanitizeText(pack.promise),
    badges: Array.isArray(pack.badges) ? pack.badges : [],
    practicalNotes: sanitizeText(pack.practicalNotes),
    image: sanitizeText(pack.image),
    featured: Boolean(pack.featured),
    sortOrder: Number(pack.sortOrder || 0),
    defaultVariantRouteId: defaultVariant?.routeId || null,
    variants
  };
};

module.exports = {
  buildGuidePackDetail,
  buildGuidePackListItem,
  estimateDistanceKm,
  estimateDurationMinutes,
  resolveRoutePoints,
  summarizeText
};
