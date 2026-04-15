import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Shop from './Shop';
import Leaderboard from './Leaderboard';

const RewardsHub = () => {
  const { user } = useAuth();

  const achievementItems = [
    {
      id: 'saved',
      label: 'Сохранённые',
      value: (user?.savedRoutes || user?.favoriteRoutes || []).length
    },
    {
      id: 'completed',
      label: 'Пройдено',
      value: (user?.completedRoutes || []).length
    },
    {
      id: 'scans',
      label: 'QR-сканы',
      value: (user?.scannedPoints || []).length
    }
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Награды</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Обмен, покупки и спокойный обзор прогресса</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Сначала смотрим, что можно получить, потом коротко проверяем личные достижения и рейтинг среди других участников.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Баланс</div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">{user?.balance || 0}</div>
            <div className="text-sm text-slate-500">баллов сейчас доступно</div>
          </div>
        </div>
      </section>

      <Shop />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Мои награды</p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">Компактный личный прогресс</h3>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {achievementItems.map((item) => (
            <div key={item.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <Leaderboard />
    </div>
  );
};

export default RewardsHub;
