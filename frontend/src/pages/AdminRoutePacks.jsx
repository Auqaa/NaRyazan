import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { useAdminWorkspace } from '../contexts/AdminWorkspaceContext';
import api from '../utils/api';
import { buildAdminWorkspaceHref, saveAdminWorkspaceHistoryEntry } from '../utils/adminWorkspaceHistory';
import { readFileAsDataUrl } from '../utils/readFileAsDataUrl';

const createEmptyRouteOption = (order, role = 'primary') => ({
  routeId: '',
  role,
  reason: '',
  order
});

const EMPTY_PACK_FORM = {
  _id: '',
  name: '',
  description: '',
  promise: '',
  practicalNotes: '',
  badgesText: '',
  image: '',
  featured: false,
  sortOrder: 0,
  status: 'draft',
  routes: [createEmptyRouteOption(1)]
};

const normalizeRouteEntries = (entries) => {
  const normalized = entries.map((entry, index) => ({
    routeId: String(entry.routeId || '').trim(),
    role: entry.role === 'alternative' ? 'alternative' : 'primary',
    reason: String(entry.reason || '').trim(),
    order: index + 1
  }));

  if (!normalized.length) {
    return [createEmptyRouteOption(1)];
  }

  if (!normalized.some((entry) => entry.role === 'primary')) {
    normalized[0] = { ...normalized[0], role: 'primary' };
  }

  return normalized;
};

const normalizePackToForm = (pack) => ({
  _id: pack._id || '',
  name: pack.name || '',
  description: pack.description || '',
  promise: pack.promise || '',
  practicalNotes: pack.practicalNotes || '',
  badgesText: (pack.badges || []).join(', '),
  image: pack.image || '',
  featured: Boolean(pack.featured),
  sortOrder: Number(pack.sortOrder || 0),
  status: pack.status === 'published' ? 'published' : 'draft',
  routes: normalizeRouteEntries(
    (pack.routes || [])
      .slice()
      .sort((left, right) => (left.order || 0) - (right.order || 0))
      .map((entry, index) => ({
        routeId: entry.routeId || '',
        role: entry.role === 'alternative' ? 'alternative' : 'primary',
        reason: entry.reason || '',
        order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : index + 1
      }))
  )
});

const parseBadges = (value) =>
  String(value || '')
    .split(',')
    .map((badge) => badge.trim())
    .filter(Boolean)
    .slice(0, 4);

const validatePackForm = (form) => {
  if (!form.name.trim()) return 'Укажите название подборки';
  if (!form.description.trim()) return 'Добавьте краткое описание подборки';
  if (!form.promise.trim()) return 'Добавьте обещание сценария';

  const routes = normalizeRouteEntries(form.routes).filter((entry) => entry.routeId);
  if (!routes.length) return 'Добавьте хотя бы один маршрут в подборку';

  const primaryCount = routes.filter((entry) => entry.role === 'primary').length;
  const alternativeCount = routes.filter((entry) => entry.role === 'alternative').length;
  const uniqueRouteIds = new Set(routes.map((entry) => entry.routeId));

  if (primaryCount !== 1) return 'В подборке должен быть ровно один primary-маршрут';
  if (alternativeCount > 2) return 'В подборке может быть не больше двух альтернатив';
  if (uniqueRouteIds.size !== routes.length) return 'Один и тот же маршрут нельзя добавить в подборку дважды';

  return '';
};

const AdminRoutePacks = () => {
  const { setMetadata, resetMetadata } = useAdminWorkspace();
  const [routes, setRoutes] = useState([]);
  const [routePacks, setRoutePacks] = useState([]);
  const [packForm, setPackForm] = useState(EMPTY_PACK_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const handledIntentRef = useRef('');
  const packIdFromQuery = searchParams.get('packId');
  const wantsNewPack = searchParams.get('new') === '1';

  const routeById = useMemo(() => new Map(routes.map((route) => [route._id, route])), [routes]);

  const stats = useMemo(
    () => ({
      total: routePacks.length,
      featured: routePacks.filter((pack) => pack.featured).length,
      published: routePacks.filter((pack) => pack.status === 'published').length
    }),
    [routePacks]
  );

  useEffect(() => resetMetadata, [resetMetadata]);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        const [routesResponse, packsResponse] = await Promise.all([api.get('/routes'), api.get('/route-packs/admin')]);
        if (!alive) return;
        setRoutes(routesResponse.data || []);
        setRoutePacks(packsResponse.data || []);
      } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.msg || 'Не удалось загрузить подборки и маршруты');
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadData();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setMetadata({
      eyebrow: 'Подборки',
      title: packForm._id ? packForm.name || 'Подборка без названия' : 'Новая подборка',
      description: packForm._id
        ? 'Редактирование curator-driven сценария поверх маршрутов в общем workspace.'
        : 'Соберите новый сценарий прогулки без выхода из рабочей админской среды.',
      stats: [
        { label: 'Подборок', value: stats.total },
        { label: 'Featured', value: stats.featured },
        { label: 'Опубликовано', value: stats.published }
      ],
      actions: [
        { label: 'Новая подборка', to: buildAdminWorkspaceHref({ type: 'pack', isNew: true }) },
        { label: 'К маршрутам', to: '/admin/routes' }
      ]
    });
  }, [setMetadata, packForm._id, packForm.name, stats]);

  useEffect(() => {
    if (loading) return;

    const nextIntent = packIdFromQuery ? `pack:${packIdFromQuery}` : wantsNewPack ? 'new' : '';
    if (!nextIntent) {
      handledIntentRef.current = '';
      return;
    }

    if (handledIntentRef.current === nextIntent) {
      return;
    }

    if (packIdFromQuery) {
      const selectedPack = routePacks.find((pack) => pack._id === packIdFromQuery);
      if (selectedPack) {
        setPackForm(normalizePackToForm(selectedPack));
        setValidationIssues(selectedPack.validation?.issues || []);
      }
      handledIntentRef.current = nextIntent;
      return;
    }

    setPackForm(EMPTY_PACK_FORM);
    setValidationIssues([]);
    handledIntentRef.current = nextIntent;
  }, [loading, packIdFromQuery, wantsNewPack, routePacks]);

  const refreshData = async (selectedId = '') => {
    const [routesResponse, packsResponse] = await Promise.all([api.get('/routes'), api.get('/route-packs/admin')]);
    setRoutes(routesResponse.data || []);
    setRoutePacks(packsResponse.data || []);

    if (selectedId) {
      const selectedPack = (packsResponse.data || []).find((pack) => pack._id === selectedId);
      if (selectedPack) {
        setPackForm(normalizePackToForm(selectedPack));
        setValidationIssues(selectedPack.validation?.issues || []);
      }
    }
  };

  const updateRouteEntry = (index, key, value) => {
    setPackForm((current) => {
      const nextRoutes = current.routes.map((entry, entryIndex) => {
        if (entryIndex !== index) {
          return key === 'role' && value === 'primary' ? { ...entry, role: 'alternative' } : entry;
        }

        return {
          ...entry,
          [key]: value
        };
      });

      return {
        ...current,
        routes: normalizeRouteEntries(nextRoutes)
      };
    });
  };

  const addRouteEntry = () => {
    setPackForm((current) => {
      if (current.routes.length >= 3) return current;

      return {
        ...current,
        routes: normalizeRouteEntries([
          ...current.routes,
          createEmptyRouteOption(current.routes.length + 1, current.routes.some((entry) => entry.role === 'primary') ? 'alternative' : 'primary')
        ])
      };
    });
  };

  const removeRouteEntry = (index) => {
    setPackForm((current) => {
      const remaining = current.routes.filter((_, entryIndex) => entryIndex !== index);

      return {
        ...current,
        routes: normalizeRouteEntries(remaining)
      };
    });
  };

  const handlePackImageUpload = async (file) => {
    if (!file) return;

    try {
      const image = await readFileAsDataUrl(file);
      setPackForm((current) => ({ ...current, image }));
    } catch (error) {
      console.error(error);
      toast.error('Не удалось загрузить изображение подборки');
    }
  };

  const handleEditPack = (pack) => {
    setPackForm(normalizePackToForm(pack));
    setValidationIssues(pack.validation?.issues || []);
    handledIntentRef.current = `pack:${pack._id}`;
    setSearchParams({ packId: pack._id });
    saveAdminWorkspaceHistoryEntry({
      type: 'pack',
      entityId: pack._id,
      label: pack.name,
      href: buildAdminWorkspaceHref({ type: 'pack', entityId: pack._id })
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setPackForm(EMPTY_PACK_FORM);
    setValidationIssues([]);
    handledIntentRef.current = 'new';
    setSearchParams({ new: '1' });
  };

  const handleDeletePack = async (packId, packName) => {
    if (!window.confirm(`Удалить подборку «${packName}»?`)) {
      return;
    }

    try {
      await api.delete(`/route-packs/admin/${packId}`);
      toast.success('Подборка удалена');
      if (packForm._id === packId) {
        handleReset();
      }
      await refreshData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.msg || 'Не удалось удалить подборку');
    }
  };

  const handleSavePack = async (event) => {
    event.preventDefault();

    const validationMessage = validatePackForm(packForm);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const normalizedRoutes = normalizeRouteEntries(packForm.routes).filter((entry) => entry.routeId);
      const payload = {
        name: packForm.name.trim(),
        description: packForm.description.trim(),
        promise: packForm.promise.trim(),
        practicalNotes: packForm.practicalNotes.trim(),
        badges: parseBadges(packForm.badgesText),
        image: String(packForm.image || ''),
        featured: Boolean(packForm.featured),
        sortOrder: Number(packForm.sortOrder || 0),
        status: packForm.status === 'published' ? 'published' : 'draft',
        routes: normalizedRoutes.map((entry, index) => ({
          routeId: entry.routeId,
          role: entry.role,
          reason: entry.reason.trim(),
          order: index + 1
        }))
      };

      const response = packForm._id
        ? await api.put(`/route-packs/admin/${packForm._id}`, payload)
        : await api.post('/route-packs/admin', payload);

      toast.success(packForm._id ? 'Подборка обновлена' : 'Подборка создана');
      setValidationIssues(response.data.validation?.issues || []);
      handledIntentRef.current = `pack:${response.data._id}`;
      setSearchParams({ packId: response.data._id });
      saveAdminWorkspaceHistoryEntry({
        type: 'pack',
        entityId: response.data._id,
        label: payload.name,
        href: buildAdminWorkspaceHref({ type: 'pack', entityId: response.data._id })
      });
      await refreshData(response.data._id);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.msg || error.response?.data?.errors?.[0]?.msg || 'Не удалось сохранить подборку');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 text-sm text-slate-600 shadow-sm">Загрузка редактора подборок...</div>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Редактор подборки</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {packForm._id ? 'Редактирование сценария' : 'Новая подборка'}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Очистить форму
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSavePack}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Название</span>
                  <input
                    name="pack-name"
                    data-testid="pack-name-input"
                    value={packForm.name}
                    onChange={(event) => setPackForm((current) => ({ ...current, name: event.target.value }))}
                    className="mt-3 w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                    placeholder="Например, Первый раз в Рязани"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Статус</span>
                  <select
                    name="pack-status"
                    value={packForm.status}
                    onChange={(event) => setPackForm((current) => ({ ...current, status: event.target.value }))}
                    className="mt-3 w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  >
                    <option value="draft">Черновик</option>
                    <option value="published">Опубликовано</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Порядок</span>
                  <input
                    type="number"
                    min="0"
                    value={packForm.sortOrder}
                    onChange={(event) => setPackForm((current) => ({ ...current, sortOrder: event.target.value }))}
                    className="mt-3 w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Бейджи</span>
                  <input
                    name="pack-badges"
                    value={packForm.badgesText}
                    onChange={(event) => setPackForm((current) => ({ ...current, badgesText: event.target.value }))}
                    className="mt-3 w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                    placeholder="90 минут, Первый визит, Главное"
                  />
                </label>

                <label className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={packForm.featured}
                    onChange={(event) => setPackForm((current) => ({ ...current, featured: event.target.checked }))}
                  />
                  Featured
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Краткое описание</span>
                <textarea
                  name="pack-description"
                  value={packForm.description}
                  onChange={(event) => setPackForm((current) => ({ ...current, description: event.target.value }))}
                  className="mt-3 min-h-[6rem] w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  placeholder="Для какого сценария подходит эта подборка."
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Обещание сценария</span>
                <textarea
                  name="pack-promise"
                  data-testid="pack-promise-input"
                  value={packForm.promise}
                  onChange={(event) => setPackForm((current) => ({ ...current, promise: event.target.value }))}
                  className="mt-3 min-h-[6rem] w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  placeholder="Что человек получит из этой прогулки."
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Когда подходит</span>
                <textarea
                  name="pack-notes"
                  value={packForm.practicalNotes}
                  onChange={(event) => setPackForm((current) => ({ ...current, practicalNotes: event.target.value }))}
                  className="mt-3 min-h-[5rem] w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  placeholder="Например, для первого дня, для вечера или для прогулки с детьми."
                />
              </label>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Изображение подборки</p>
                    <p className="mt-1 text-sm text-slate-600">Можно использовать отдельную обложку или опереться на фото основного маршрута.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black">
                    Загрузить фото
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handlePackImageUpload(event.target.files?.[0])} />
                  </label>
                </div>

                {packForm.image && (
                  <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white p-3">
                    <img src={packForm.image} alt="Подборка" className="h-44 w-full rounded-xl object-cover" />
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Маршруты внутри подборки</p>
                    <p className="mt-1 text-sm text-slate-600">Один primary-маршрут и до двух альтернатив с редакторским объяснением.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addRouteEntry}
                    disabled={packForm.routes.length >= 3}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
                  >
                    Добавить вариант
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {packForm.routes.map((entry, index) => (
                    <article key={`route-option-${index}`} className="rounded-[1.3rem] border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">Вариант #{index + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeRouteEntry(index)}
                          className="rounded-full border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          Удалить
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Маршрут</span>
                          <select
                            name={`route-option-${index}`}
                            data-testid={index === 0 ? 'pack-route-select-0' : undefined}
                            value={entry.routeId}
                            onChange={(event) => updateRouteEntry(index, 'routeId', event.target.value)}
                            className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                          >
                            <option value="">Выберите маршрут</option>
                            {routes.map((route) => (
                              <option key={route._id} value={route._id}>
                                {route.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Роль</span>
                          <select
                            value={entry.role}
                            onChange={(event) => updateRouteEntry(index, 'role', event.target.value)}
                            className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                          >
                            <option value="primary">Primary</option>
                            <option value="alternative">Alternative</option>
                          </select>
                        </label>
                      </div>

                      <label className="mt-4 block">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Почему этот маршрут подходит</span>
                        <textarea
                          value={entry.reason}
                          onChange={(event) => updateRouteEntry(index, 'reason', event.target.value)}
                          className="mt-3 min-h-[5rem] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                          placeholder="Коротко объясните роль маршрута внутри сценария."
                        />
                      </label>
                    </article>
                  ))}
                </div>
              </div>

              {validationIssues.length > 0 && (
                <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4" data-testid="pack-validation-issues">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Нужна правка перед публикацией</p>
                  <div className="mt-3 space-y-2 text-sm text-amber-900">
                    {validationIssues.map((issue) => (
                      <div key={issue}>{issue}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  data-testid="pack-save-button"
                  disabled={saving}
                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
                >
                  {saving ? 'Сохраняем...' : packForm._id ? 'Сохранить подборку' : 'Создать подборку'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Сбросить
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Все подборки</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Сценарии, которые видит пользователь</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{routePacks.length} записей</div>
            </div>

            <div className="mt-5 space-y-4">
              {routePacks.length ? (
                routePacks.map((pack) => (
                  <article key={pack._id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-xl">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                            {pack.status === 'published' ? 'Опубликовано' : 'Черновик'}
                          </span>
                          {pack.featured && (
                            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Featured</span>
                          )}
                        </div>
                        <h3 className="mt-3 text-lg font-bold text-slate-900">{pack.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{pack.description}</p>
                        <p className="mt-2 text-sm font-medium text-slate-800">{pack.promise}</p>
                      </div>
                      {pack.image && <img src={pack.image} alt={pack.name} className="h-24 w-24 rounded-2xl object-cover" />}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      {(pack.routes || []).map((entry) => (
                        <div key={`${pack._id}-${entry.routeId}-${entry.order}`}>
                          <span className="font-semibold text-slate-900">
                            {entry.role === 'primary' ? 'Primary' : 'Alternative'}:
                          </span>{' '}
                          {routeById.get(entry.routeId)?.name || entry.routeId}
                        </div>
                      ))}
                    </div>

                    {pack.validation?.issues?.length > 0 && (
                      <div className="mt-4 rounded-[1.1rem] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        {pack.validation.issues.map((issue) => (
                          <div key={issue}>{issue}</div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditPack(pack)}
                        className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                      >
                        Редактировать
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePack(pack._id, pack.name)}
                        className="rounded-full border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        Удалить
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-slate-500">Пока нет подборок. Создайте первую в форме слева.</p>
              )}
            </div>
          </section>
        </div>
    </div>
  );
};

export default AdminRoutePacks;
