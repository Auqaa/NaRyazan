import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAdminWorkspace } from '../contexts/AdminWorkspaceContext';
import api from '../utils/api';
import {
  buildAdminWorkspaceHref,
  pruneAdminWorkspaceHistory
} from '../utils/adminWorkspaceHistory';

const AdminHome = () => {
  const { setMetadata, resetMetadata } = useAdminWorkspace();
  const [routes, setRoutes] = useState([]);
  const [routePacks, setRoutePacks] = useState([]);
  const [recentWork, setRecentWork] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => resetMetadata, [resetMetadata]);

  useEffect(() => {
    let alive = true;

    const loadAdminHome = async () => {
      try {
        const [routesResponse, packsResponse] = await Promise.all([api.get('/routes'), api.get('/route-packs/admin')]);
        if (!alive) return;

        const nextRoutes = routesResponse.data || [];
        const nextRoutePacks = packsResponse.data || [];
        const validRouteIds = new Set(nextRoutes.map((route) => route._id));
        const validPackIds = new Set(nextRoutePacks.map((pack) => pack._id));
        const reconciledRecentWork = pruneAdminWorkspaceHistory((entry) => {
          if (entry.type === 'route') return validRouteIds.has(entry.entityId);
          if (entry.type === 'pack') return validPackIds.has(entry.entityId);
          return false;
        });

        setRoutes(nextRoutes);
        setRoutePacks(nextRoutePacks);
        setRecentWork(reconciledRecentWork);
      } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.msg || 'Не удалось загрузить admin home');
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadAdminHome();

    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      { label: 'Маршрутов', value: routes.length },
      { label: 'Подборок', value: routePacks.length },
      { label: 'Опубликовано', value: routePacks.filter((pack) => pack.status === 'published').length }
    ],
    [routes, routePacks]
  );

  useEffect(() => {
    setMetadata({
      eyebrow: 'Рабочее пространство',
      title: 'Admin Home',
      description: 'Быстрый старт для новых сценариев, последних правок и перехода между editor pages.',
      stats,
      actions: [
        { label: 'Новый маршрут', to: '/admin/routes?new=1' },
        { label: 'Новая подборка', to: '/admin/packs?new=1' }
      ]
    });
  }, [setMetadata, stats]);

  const quickActions = [
    {
      label: 'Создать маршрут',
      description: 'Начать новый маршрут с чистой формы и сразу перейти в редактор точек.',
      to: buildAdminWorkspaceHref({ type: 'route', isNew: true })
    },
    {
      label: 'Создать подборку',
      description: 'Собрать новый сценарий поверх уже существующих маршрутов.',
      to: buildAdminWorkspaceHref({ type: 'pack', isNew: true })
    },
    {
      label: 'Открыть маршруты',
      description: 'Перейти к списку маршрутов и продолжить навигацию по существующим записям.',
      to: '/admin/routes'
    },
    {
      label: 'Открыть подборки',
      description: 'Перейти к редактору curated packs и статусам публикации.',
      to: '/admin/packs'
    }
  ];

  const highlightedRoutes = routes.slice(0, 3);
  const highlightedPacks = routePacks
    .slice()
    .sort((left, right) => {
      if (left.status === right.status) return 0;
      return left.status === 'published' ? -1 : 1;
    })
    .slice(0, 3);

  if (loading) {
    return <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 text-sm text-slate-600 shadow-sm">Загрузка admin home...</div>;
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 xl:grid-cols-2">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            data-testid={`admin-home-action-${action.label}`}
            className="rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Quick Action</div>
            <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-950">{action.label}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{action.description}</p>
          </Link>
        ))}
      </section>

      <section
        className="rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-lg sm:p-6"
        data-testid="admin-home-recent-work"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Recent Work</p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Продолжить с последнего места</h3>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{recentWork.length} записей</div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recentWork.length ? (
            recentWork.map((entry) => (
              <Link
                key={`${entry.type}-${entry.entityId}`}
                to={entry.href}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {entry.type === 'route' ? 'Маршрут' : 'Подборка'}
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{entry.label}</div>
                <div className="mt-3 text-sm text-slate-600">Открыть сущность в редакторе</div>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              Пока нет recent work. Откройте маршрут или подборку, и они появятся здесь.
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-lg sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Маршруты</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Что чаще всего продолжат сегодня</h3>
          <div className="mt-5 space-y-3">
            {highlightedRoutes.length ? (
              highlightedRoutes.map((route) => (
                <Link
                  key={route._id}
                  to={buildAdminWorkspaceHref({ type: 'route', entityId: route._id })}
                  className="block rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="text-lg font-semibold text-slate-900">{route.name}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{route.description || 'Описание пока не заполнено.'}</div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500">Пока нет маршрутов. Начните с создания первого.</p>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-lg sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Подборки</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Сценарии, требующие внимания</h3>
          <div className="mt-5 space-y-3">
            {highlightedPacks.length ? (
              highlightedPacks.map((pack) => (
                <Link
                  key={pack._id}
                  to={buildAdminWorkspaceHref({ type: 'pack', entityId: pack._id })}
                  className="block rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-slate-900">{pack.name}</div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {pack.status === 'published' ? 'Опубликовано' : 'Черновик'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{pack.promise || pack.description || 'Без краткого обещания.'}</div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500">Пока нет подборок. Создайте первый сценарий поверх маршрутов.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminHome;
