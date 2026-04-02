const STORAGE_KEY = 'na-ryazan.admin.workspace.history';
const HISTORY_LIMIT = 6;

const readRawEntries = () => {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return [];

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

const writeRawEntries = (entries) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return entries;
};

export const getAdminWorkspaceHistory = () =>
  readRawEntries()
    .filter((entry) => entry && entry.type && entry.href)
    .sort((left, right) => Number(right.touchedAt || 0) - Number(left.touchedAt || 0));

export const buildAdminWorkspaceHref = ({ type, entityId, isNew = false }) => {
  if (type === 'route') {
    return isNew ? '/admin/routes?new=1' : `/admin/routes?routeId=${entityId}`;
  }

  if (type === 'pack') {
    return isNew ? '/admin/packs?new=1' : `/admin/packs?packId=${entityId}`;
  }

  return '/admin';
};

export const saveAdminWorkspaceHistoryEntry = (entry) => {
  const nextEntry = {
    type: entry.type,
    entityId: entry.entityId || '',
    label: entry.label || 'Без названия',
    href: entry.href,
    touchedAt: entry.touchedAt || Date.now()
  };

  const deduped = getAdminWorkspaceHistory().filter(
    (existingEntry) => !(existingEntry.type === nextEntry.type && existingEntry.entityId === nextEntry.entityId)
  );

  return writeRawEntries([nextEntry, ...deduped].slice(0, HISTORY_LIMIT));
};

export const pruneAdminWorkspaceHistory = (isValidEntry) => {
  const filteredEntries = getAdminWorkspaceHistory().filter((entry) => isValidEntry(entry));
  return writeRawEntries(filteredEntries);
};

export const clearAdminWorkspaceHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};
