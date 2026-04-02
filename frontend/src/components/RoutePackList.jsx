import React from 'react';

const RoutePackList = ({ packs = [], selectedPackId, onSelectPack }) => {
  if (!packs.length) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="route-pack-list">
      {packs.map((pack) => {
        const isSelected = pack._id === selectedPackId;

        return (
          <button
            key={pack._id}
            type="button"
            data-testid={`route-pack-card-${pack._id}`}
            onClick={() => onSelectPack?.(pack)}
            className={`w-full rounded-[1.6rem] border p-4 text-left transition ${
              isSelected
                ? 'border-sky-300 bg-sky-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  {pack.featured && (
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                      Сценарий дня
                    </span>
                  )}
                  {(pack.badges || []).slice(0, 3).map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{pack.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{pack.description}</p>
              </div>

              {pack.image && (
                <img
                  src={pack.image}
                  alt={pack.name}
                  className="hidden h-24 w-24 rounded-2xl object-cover sm:block"
                />
              )}
            </div>

            <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Обещание</div>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-800">{pack.promise}</p>
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Рекомендуемый маршрут</div>
                <div className="mt-2 font-semibold text-slate-900">{pack.primaryRoute?.name || 'Маршрут подбирается'}</div>
              </div>
              <div className="rounded-[1.1rem] border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Альтернативы</div>
                <div className="mt-2 font-semibold text-slate-900">{pack.alternatives?.length || 0}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default RoutePackList;
