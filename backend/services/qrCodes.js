const KNOWN_QR_PARAM_KEYS = ['qr', 'qrvalue', 'code', 'value', 'qr_code', 'qr-code'];

const stripWrappingQuotes = (value) => value.replace(/^['"`]+|['"`]+$/g, '');

const safeDecodeURIComponent = (value) => {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
};

const normalizeQrValueForMatch = (value) => {
  if (value == null) return '';

  let normalized = String(value).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!normalized) return '';

  normalized = safeDecodeURIComponent(normalized);
  normalized = stripWrappingQuotes(normalized);
  normalized = normalized.replace(/\s+/g, '').replace(/^\/+|\/+$/g, '').toLowerCase();

  return normalized;
};

const addCandidate = (bucket, value) => {
  const normalized = normalizeQrValueForMatch(value);
  if (!normalized || bucket.includes(normalized)) return;
  bucket.push(normalized);
};

const addUrlCandidates = (bucket, rawInput) => {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) return;

  let url;
  try {
    url = new URL(trimmed);
  } catch (error) {
    try {
      url = new URL(trimmed, 'https://qr.local');
    } catch (nestedError) {
      return;
    }
  }

  url.searchParams.forEach((paramValue, paramKey) => {
    if (KNOWN_QR_PARAM_KEYS.includes(String(paramKey || '').toLowerCase())) {
      addCandidate(bucket, paramValue);
    }
  });

  const pathSegments = (url.pathname || '').split('/').filter(Boolean);
  if (pathSegments.length) {
    addCandidate(bucket, pathSegments[pathSegments.length - 1]);
  }

  const hash = String(url.hash || '').replace(/^#/, '');
  if (!hash) return;

  addCandidate(bucket, hash);

  const hashQuery = hash.includes('?') ? hash.split('?')[1] : hash;
  const hashParams = new URLSearchParams(hashQuery);
  hashParams.forEach((paramValue, paramKey) => {
    if (KNOWN_QR_PARAM_KEYS.includes(String(paramKey || '').toLowerCase())) {
      addCandidate(bucket, paramValue);
    }
  });

  const hashSegments = hash.split('/').filter(Boolean);
  if (hashSegments.length) {
    addCandidate(bucket, hashSegments[hashSegments.length - 1]);
  }
};

const extractQrCandidates = (rawInput) => {
  const candidates = [];
  addCandidate(candidates, rawInput);
  addUrlCandidates(candidates, rawInput);
  return candidates;
};

const valuesMatch = (left, right) => normalizeQrValueForMatch(left) === normalizeQrValueForMatch(right);

module.exports = {
  extractQrCandidates,
  normalizeQrValueForMatch,
  valuesMatch
};
