import React from 'react';
import QRScanner from './QRScanner';
import YandexMap from './YandexMap';

const ActiveRoutePanel = ({
  route,
  points,
  currentPoint,
  nextPoint,
  scannedPointIds = [],
  showMap,
  onToggleMap,
  onBackToPlan,
  routePreview,
  mapConfig,
  routeOrigin,
  userLocation,
  onScanSuccess
}) => {
  if (!route) return null;

  return (
    <section className="space-y-4">
      <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Маршрут активен</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">{route.name}</h2>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Идите к текущей точке, сканируйте QR и спокойно переходите к следующему шагу.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToPlan}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:bg-white/10"
          >
            К плану
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.4rem] bg-white/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Пройдено</div>
            <div className="mt-2 text-2xl font-semibold">{scannedPointIds.length}</div>
          </div>
          <div className="rounded-[1.4rem] bg-white/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Текущая точка</div>
            <div className="mt-2 text-sm font-semibold">{currentPoint?.name || 'Следующая точка появится после старта'}</div>
          </div>
          <div className="rounded-[1.4rem] bg-white/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Следом</div>
            <div className="mt-2 text-sm font-semibold">{nextPoint?.name || 'Финиш маршрута'}</div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Навигация</p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">Карта и QR на одном экране</h3>
          </div>
          <button
            type="button"
            onClick={onToggleMap}
            className="rounded-[1rem] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {showMap ? 'Скрыть карту' : 'Открыть карту'}
          </button>
        </div>

        {showMap && (
          <div className="mt-5 overflow-hidden rounded-[1.7rem] border border-slate-200 bg-slate-50">
            <YandexMap
              mapKey={mapConfig.mapKey}
              center={mapConfig.center}
              routePoints={points}
              routeGeometry={routePreview?.geometry || []}
              userLocation={userLocation}
              routingOrigin={routeOrigin}
              scannedPointIds={scannedPointIds}
            />
          </div>
        )}

        {!showMap && (
          <div className="mt-5 rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            Карта скрыта, но маршрут остаётся активным. В любой момент можно вернуть обзор и продолжить путь к текущей точке.
          </div>
        )}

        <div className="mt-5 rounded-[1.7rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Текущая точка</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-950">{currentPoint?.name || route.name}</h4>
              <p className="mt-1 text-sm text-slate-500">
                {currentPoint?.address || currentPoint?.description || 'Двигайтесь по маршруту и сканируйте QR на каждой точке.'}
              </p>
            </div>
            {nextPoint && (
              <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-right">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Дальше</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{nextPoint.name}</div>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Главное действие</p>
                <h5 className="mt-1 text-base font-semibold text-slate-950">Сканировать QR</h5>
              </div>
            </div>
            <QRScanner onScanSuccess={onScanSuccess} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ActiveRoutePanel;
