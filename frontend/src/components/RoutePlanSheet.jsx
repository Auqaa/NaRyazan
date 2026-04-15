import React from 'react';
import YandexMap from './YandexMap';

const formatDistanceLabel = (distanceKm) => {
  if (!distanceKm) return 'рядом со стартом';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} м`;
  return `${distanceKm.toFixed(distanceKm > 9 ? 0 : 1)} км`;
};

const formatDurationLabel = (minutes) => `${Math.max(1, Math.round(minutes || 0))} мин`;

const RoutePlanSheet = ({
  route,
  points,
  routePreview,
  routePreviewLoading,
  mapConfig,
  routeOrigin,
  userLocation,
  onUseMyLocation,
  onClearStartPoint,
  onBack,
  onStartRoute,
  pointMeta = []
}) => {
  if (!route) return null;

  const routeGeometry = routePreview?.geometry || [];
  const summaryDistance = routePreview?.distanceMeters ? routePreview.distanceMeters / 1000 : route.distanceKm || 0;
  const summaryDuration = routePreview?.durationSeconds ? routePreview.durationSeconds / 60 : route.durationMinutes || 0;

  return (
    <section className="space-y-4">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:bg-slate-50"
            >
              Назад к маршрутам
            </button>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{route.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{route.description}</p>
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">План</div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{points.length} точек</div>
            <div className="text-sm text-slate-500">{formatDistanceLabel(summaryDistance)} • {formatDurationLabel(summaryDuration)}</div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.7rem] border border-slate-200 bg-slate-50">
          <YandexMap
            mapKey={mapConfig.mapKey}
            center={mapConfig.center}
            routePoints={points}
            routeGeometry={routeGeometry}
            userLocation={userLocation}
            routingOrigin={routeOrigin}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onStartRoute}
            className="rounded-[1.2rem] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
          >
            Начать маршрут
          </button>
          {routeOrigin ? (
            <button
              type="button"
              onClick={onClearStartPoint}
              className="rounded-[1.2rem] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Старт от первой точки
            </button>
          ) : (
            <button
              type="button"
              onClick={onUseMyLocation}
              className="rounded-[1.2rem] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Старт от моего местоположения
            </button>
          )}
        </div>

        {routePreviewLoading && (
          <p className="mt-3 text-sm text-slate-500">Пересчитываем прогулку под ваш текущий старт...</p>
        )}
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Точки маршрута</p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">Спокойный пошаговый план</h3>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{points.length}</div>
        </div>

        <div className="mt-5 space-y-3">
          {points.map((point, index) => {
            const meta = pointMeta[index] || {};

            return (
              <div key={point._id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-slate-950">{point.name}</h4>
                      {index === 0 && (
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Старт
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{point.address || point.description || 'Адрес уточняется'}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1">{formatDistanceLabel(meta.distanceKm)}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1">{formatDurationLabel(meta.durationMinutes)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RoutePlanSheet;
