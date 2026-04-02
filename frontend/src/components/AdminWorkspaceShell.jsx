import React, { useCallback, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import AdminWorkspaceContext, { DEFAULT_ADMIN_WORKSPACE_METADATA } from '../contexts/AdminWorkspaceContext';
import AdminSectionTabs from './AdminSectionTabs';

const SECTION_METADATA = {
  home: {
    eyebrow: 'Рабочее пространство',
    title: 'Admin Home',
    description: 'Возвращайтесь к последним правкам и быстро открывайте нужный редактор.'
  },
  routes: {
    eyebrow: 'Маршруты',
    title: 'Маршруты',
    description: 'Редактирование маршрутов, точек и QR-кодов в едином рабочем контуре.'
  },
  packs: {
    eyebrow: 'Подборки',
    title: 'Подборки',
    description: 'Кураторские сценарии поверх маршрутов и их публикационного состояния.'
  }
};

const getActiveSection = (pathname) => {
  if (pathname.startsWith('/admin/routes')) return 'routes';
  if (pathname.startsWith('/admin/packs')) return 'packs';
  return 'home';
};

const AdminWorkspaceShell = () => {
  const location = useLocation();
  const activeSection = getActiveSection(location.pathname);
  const [metadata, setMetadata] = useState(DEFAULT_ADMIN_WORKSPACE_METADATA);
  const resetMetadata = useCallback(() => {
    setMetadata(DEFAULT_ADMIN_WORKSPACE_METADATA);
  }, []);

  const mergedMetadata = useMemo(
    () => ({
      ...SECTION_METADATA[activeSection],
      ...metadata,
      stats: metadata.stats || [],
      actions: metadata.actions || []
    }),
    [activeSection, metadata]
  );

  const contextValue = useMemo(
    () => ({
      metadata: mergedMetadata,
      setMetadata,
      resetMetadata
    }),
    [mergedMetadata, resetMetadata]
  );

  return (
    <AdminWorkspaceContext.Provider value={contextValue}>
      <div className="min-h-[calc(100vh-73px)] bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_100%)]">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
          <aside className="hidden lg:block">
            <div className="sticky top-6 overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 p-5 text-white shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/80">Admin Workspace</p>
              <h1 className="mt-3 text-2xl font-bold tracking-tight">Панель куратора</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Одна навигация для главной, маршрутов и подборок без провала в изолированные экраны.
              </p>

              <AdminSectionTabs className="mt-6" orientation="vertical" />

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Сейчас открыто</div>
                <div className="mt-2 text-lg font-semibold">{mergedMetadata.title}</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{mergedMetadata.description}</p>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-lg backdrop-blur sm:p-6">
              <AdminSectionTabs className="lg:hidden" />

              <div className="mt-4 flex flex-col gap-4 lg:mt-0 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">{mergedMetadata.eyebrow}</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{mergedMetadata.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{mergedMetadata.description}</p>
                </div>

                {mergedMetadata.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mergedMetadata.actions.map((action) => (
                      <Link
                        key={`${action.to}-${action.label}`}
                        to={action.to}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {mergedMetadata.stats.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-3">
                  {mergedMetadata.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="min-w-[10rem] rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{stat.label}</div>
                      <div className="mt-2 text-lg font-bold text-slate-900">{stat.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-6">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </AdminWorkspaceContext.Provider>
  );
};

export default AdminWorkspaceShell;
