import React from 'react';

const routeThemeLabels = {
  popular: 'Популярное',
  water: 'У воды',
  history: 'История',
  parks: 'Парки'
};

const RouteList = ({
  routes = [],
  loading = false,
  selectedRouteId,
  favoriteRouteIds = [],
  onSelectRoute,
  onToggleFavorite,
  actionLabel = 'Открыть план'
}) => {
  if (loading) return <div className="text-sm text-gray-600">Загрузка...</div>;

  if (!routes.length) {
    return <div className="text-sm text-gray-600">Маршруты не найдены. Попробуйте изменить фильтры.</div>;
  }

  return (
    <div className="space-y-3">
      {routes.map((route) => {
        const isSelected = route._id === selectedRouteId;
        const isFavorite = favoriteRouteIds.includes(route._id);

        return (
          <div
            key={route._id}
            className={`overflow-hidden rounded-[1.75rem] border bg-white transition-shadow ${
              isSelected ? 'border-sky-200 shadow-[0_12px_30px_rgba(14,165,233,0.12)]' : 'border-slate-200 hover:shadow-sm'
            }`}
          >
            {route.image && <img src={route.image} alt={route.name} className="h-40 w-full object-cover" />}

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{route.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{route.description}</p>
                </div>
                <button
                  onClick={() => onToggleFavorite?.(route._id)}
                  className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                    isFavorite ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  {isFavorite ? 'В сохранённых' : 'Сохранить'}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {(route.themes || []).map((theme) => (
                  <span key={theme} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                    {routeThemeLabels[theme] || theme}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                  Точек: <span className="font-semibold">{route.pointCount || route.points?.length || 0}</span>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                  Длина: <span className="font-semibold">{route.distanceKm || 0} км</span>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                  Время: <span className="font-semibold">{route.durationMinutes || 0} мин</span>
                </div>
              </div>

              <button
                onClick={() => onSelectRoute(route)}
                className="mt-4 rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-black"
              >
                {isSelected ? 'План открыт' : actionLabel}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RouteList;
