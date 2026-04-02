import React from 'react';

const formatRouteMeta = (route) => {
  const pointCount = route.pointCount || route.points?.length || 0;
  const duration = route.durationMinutes || 0;
  const distance = route.distanceKm || 0;

  return `${pointCount} точек • ${distance} км • ${duration} мин`;
};

const RoutePackDetail = ({ pack, selectedRouteId, onChooseRoute }) => {
  if (!pack) {
    return null;
  }

  const routeOptions = [pack.primaryRouteOption, ...(pack.alternatives || [])].filter(Boolean);

  return (
    <div
      className="mt-4 rounded-[1.8rem] border border-slate-200 bg-slate-50 p-4"
      data-testid={`route-pack-detail-${pack._id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Сценарий прогулки</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{pack.name}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">{pack.promise}</p>
        </div>

        {pack.image && (
          <img
            src={pack.image}
            alt={pack.name}
            className="hidden h-28 w-32 rounded-[1.3rem] object-cover sm:block"
          />
        )}
      </div>

      {pack.practicalNotes && (
        <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Когда подходит</div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{pack.practicalNotes}</p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {routeOptions.map((option) => {
          const isSelected = option.route._id === selectedRouteId;
          const isPrimary = option.role === 'primary';

          return (
            <div
              key={`${pack._id}-${option.route._id}`}
              data-testid={`route-pack-option-${option.route._id}`}
              className={`rounded-[1.4rem] border p-4 ${
                isPrimary ? 'border-sky-200 bg-white' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        isPrimary ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isPrimary ? 'Рекомендуем' : 'Альтернатива'}
                    </span>
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      {formatRouteMeta(option.route)}
                    </span>
                  </div>
                  <h4 className="mt-3 text-lg font-bold text-slate-900">{option.route.name}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{option.reason || option.route.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onChooseRoute?.(option.route)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isSelected
                      ? 'border border-amber-200 bg-amber-50 text-amber-700'
                      : 'bg-slate-900 text-white hover:bg-black'
                  }`}
                >
                  {isSelected ? 'Маршрут выбран' : 'Выбрать маршрут'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoutePackDetail;
