import {
  buildAdminWorkspaceHref,
  clearAdminWorkspaceHistory,
  getAdminWorkspaceHistory,
  pruneAdminWorkspaceHistory,
  saveAdminWorkspaceHistoryEntry
} from '../adminWorkspaceHistory';

describe('adminWorkspaceHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    clearAdminWorkspaceHistory();
  });

  it('deduplicates entries by entity and keeps the latest timestamp', () => {
    saveAdminWorkspaceHistoryEntry({
      type: 'route',
      entityId: 'route-1',
      label: 'Old label',
      href: buildAdminWorkspaceHref({ type: 'route', entityId: 'route-1' }),
      touchedAt: 1
    });

    saveAdminWorkspaceHistoryEntry({
      type: 'route',
      entityId: 'route-1',
      label: 'Fresh label',
      href: buildAdminWorkspaceHref({ type: 'route', entityId: 'route-1' }),
      touchedAt: 2
    });

    const history = getAdminWorkspaceHistory();

    expect(history).toHaveLength(1);
    expect(history[0].label).toBe('Fresh label');
    expect(history[0].touchedAt).toBe(2);
  });

  it('prunes invalid entries and builds deep-link hrefs', () => {
    saveAdminWorkspaceHistoryEntry({
      type: 'route',
      entityId: 'route-1',
      label: 'Route',
      href: buildAdminWorkspaceHref({ type: 'route', entityId: 'route-1' }),
      touchedAt: 1
    });

    saveAdminWorkspaceHistoryEntry({
      type: 'pack',
      entityId: 'pack-1',
      label: 'Pack',
      href: buildAdminWorkspaceHref({ type: 'pack', entityId: 'pack-1' }),
      touchedAt: 2
    });

    const pruned = pruneAdminWorkspaceHistory((entry) => entry.type === 'pack');

    expect(pruned).toHaveLength(1);
    expect(pruned[0].href).toBe('/admin/packs?packId=pack-1');
    expect(buildAdminWorkspaceHref({ type: 'route', isNew: true })).toBe('/admin/routes?new=1');
  });
});
