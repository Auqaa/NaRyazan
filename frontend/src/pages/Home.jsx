import React, { useEffect, useMemo, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import RouteList from '../components/RouteList';
import RoutePackList from '../components/RoutePackList';
import RoutePlanSheet from '../components/RoutePlanSheet';
import ActiveRoutePanel from '../components/ActiveRoutePanel';
import { useAuth } from '../contexts/AuthContext';
import { getPointsOffline, getRoutesOffline, savePointsOffline, saveRoutesOffline } from '../utils/offlineStorage';
import api from '../utils/api';

const themeButtons = [
  { id: 'all', label: 'Все' },
  { id: 'popular', label: 'Популярное' },
  { id: 'water', label: 'У воды' },
  { id: 'history', label: 'История' },
  { id: 'parks', label: 'Парки' }
];

const sortByRouteOrder = (route) => (route?.points || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

const measureDistance = (first, second) => {
  const dx = (first.lat - second.lat) * 111;
  const dy = (first.lng - second.lng) * 71;
  return Math.sqrt(dx * dx + dy * dy);
};

const sortPackRoutes = (pack) => (pack?.routes || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

const buildRoutePackViewModel = (pack, routeById) => {
  const resolvedRoutes = sortPackRoutes(pack)
    .map((entry) => ({
      ...entry,
      route: routeById.get(entry.routeId)
    }))
    .filter((entry) => entry.route);

  const primaryRouteOption = resolvedRoutes.find((entry) => entry.role === 'primary');
  if (!primaryRouteOption) return null;

  return {
    ...pack,
    image: pack.image || primaryRouteOption.route.image || '',
    primaryRoute: primaryRouteOption.route,
    primaryRouteOption,
    resolvedRoutes
  };
};

const estimateMinutes = (distanceKm) => {
  if (!distanceKm) return 3;
  return Math.max(4, Math.round((distanceKm / 4.5) * 60));
};

const Home = () => {
  const { user, toggleFavoriteRoute } = useAuth();
  const [, setPoints] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [routePacks, setRoutePacks] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedPackId, setSelectedPackId] = useState('');
  const [routePreview, setRoutePreview] = useState(null);
  const [routePreviewLoading, setRoutePreviewLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [routeOrigin, setRouteOrigin] = useState(null);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [loadingRoutePacks, setLoadingRoutePacks] = useState(true);
  const [routeQuery, setRouteQuery] = useState('');
  const [activeTheme, setActiveTheme] = useState('all');
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [mapConfig, setMapConfig] = useState({
    mapKey: '',
    center: { lat: 54.629624, lng: 39.742445 }
  });
  const [, startFiltering] = useTransition();

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      setLoadingRoutes(true);
      setLoadingRoutePacks(true);

      if (navigator.onLine) {
        const [pointsResult, routesResult, packsResult, configResult] = await Promise.allSettled([
          api.get('/points'),
          api.get('/routes'),
          api.get('/route-packs'),
          api.get('/config')
        ]);

        if (!alive) return;

        if (pointsResult.status === 'fulfilled') {
          setPoints(pointsResult.value.data);
          await savePointsOffline(pointsResult.value.data);
        } else {
          setPoints(await getPointsOffline());
        }

        if (routesResult.status === 'fulfilled') {
          setRoutes(routesResult.value.data);
          await saveRoutesOffline(routesResult.value.data);
        } else {
          setRoutes(await getRoutesOffline());
        }

        if (packsResult.status === 'fulfilled') {
          setRoutePacks(packsResult.value.data || []);
        } else {
          console.error('Failed to load route packs', packsResult.reason);
          setRoutePacks([]);
        }

        if (configResult.status === 'fulfilled') {
          setMapConfig(configResult.value.data);
        }
      } else {
        const [offlinePoints, offlineRoutes] = await Promise.all([getPointsOffline(), getRoutesOffline()]);
        if (!alive) return;
        setPoints(offlinePoints);
        setRoutes(offlineRoutes);
        setRoutePacks([]);
      }

      setLoadingRoutes(false);
      setLoadingRoutePacks(false);
    };

    loadData();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;

    const watchId = navigator.geolocation.watchPosition(
      (position) =>
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
      (error) => console.error(error),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!routeOrigin && userLocation) {
      setRouteOrigin(userLocation);
    }
  }, [routeOrigin, userLocation]);

  const favoriteRouteIds = useMemo(
    () => new Set((user?.favoriteRoutes || user?.savedRoutes || []).map((route) => route._id || route)),
    [user]
  );

  const routeById = useMemo(() => new Map(routes.map((route) => [route._id, route])), [routes]);

  const publicRoutePacks = useMemo(
    () => routePacks.map((pack) => buildRoutePackViewModel(pack, routeById)).filter(Boolean),
    [routeById, routePacks]
  );

  const selectedRoutePack = useMemo(
    () => publicRoutePacks.find((pack) => pack._id === selectedPackId) || null,
    [publicRoutePacks, selectedPackId]
  );

  const packRoutes = useMemo(
    () => selectedRoutePack?.resolvedRoutes?.map((entry) => entry.route) || [],
    [selectedRoutePack]
  );

  const filteredRoutes = useMemo(() => {
    const query = routeQuery.trim().toLowerCase();
    const sourceRoutes = selectedRoutePack ? packRoutes : routes;

    return sourceRoutes.filter((route) => {
      if (activeTheme !== 'all' && !(route.themes || []).includes(activeTheme)) {
        return false;
      }

      if (!query) return true;

      const haystack = `${route.name} ${route.description} ${(route.themes || []).join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [activeTheme, packRoutes, routeQuery, routes, selectedRoutePack]);

  const selectedRoutePoints = useMemo(() => sortByRouteOrder(selectedRoute), [selectedRoute]);
  const scannedPointIds = useMemo(() => (user?.scannedPoints?.map((point) => point._id || point) || []), [user]);

  const routeWaypoints = useMemo(() => {
    if (!selectedRoutePoints.length) return [];

    const sequence = [];
    if (routeOrigin) {
      sequence.push({ lat: routeOrigin.lat, lng: routeOrigin.lng, kind: 'origin' });
    }

    selectedRoutePoints.forEach((point) => {
      sequence.push({ lat: point.lat, lng: point.lng, kind: 'point', refId: point._id });
    });

    return sequence;
  }, [routeOrigin, selectedRoutePoints]);

  useEffect(() => {
    let alive = true;

    const loadRoutePreview = async () => {
      if (routeWaypoints.length < 2) {
        setRoutePreview(null);
        setRoutePreviewLoading(false);
        return;
      }

      setRoutePreviewLoading(true);

      try {
        const response = await api.post('/routing/pedestrian', {
          waypoints: routeWaypoints.map((point) => ({ lat: point.lat, lng: point.lng }))
        });

        if (alive) {
          setRoutePreview(response.data);
        }
      } catch (error) {
        console.error(error);
        if (alive) {
          setRoutePreview({
            geometry: routeWaypoints.map((point) => [point.lng, point.lat]),
            distanceMeters: 0,
            durationSeconds: 0,
            source: 'local',
            error: 'Failed to build route'
          });
        }
      } finally {
        if (alive) {
          setRoutePreviewLoading(false);
        }
      }
    };

    loadRoutePreview();
    return () => {
      alive = false;
    };
  }, [routeWaypoints]);

  const pointMeta = useMemo(
    () =>
      selectedRoutePoints.map((point, index) => {
        const previousPoint =
          index === 0
            ? routeOrigin
            : selectedRoutePoints[index - 1]
            ? { lat: selectedRoutePoints[index - 1].lat, lng: selectedRoutePoints[index - 1].lng }
            : null;

        const distanceKm = previousPoint ? measureDistance(previousPoint, point) : 0;

        return {
          distanceKm,
          durationMinutes: estimateMinutes(distanceKm)
        };
      }),
    [routeOrigin, selectedRoutePoints]
  );

  const currentPointIndex = useMemo(
    () => selectedRoutePoints.findIndex((point) => !scannedPointIds.includes(point._id)),
    [scannedPointIds, selectedRoutePoints]
  );

  const currentPoint = currentPointIndex >= 0 ? selectedRoutePoints[currentPointIndex] : selectedRoutePoints[selectedRoutePoints.length - 1] || null;
  const nextPoint = currentPointIndex >= 0 ? selectedRoutePoints[currentPointIndex + 1] || null : null;

  const handleSelectRoutePack = (pack) => {
    setSelectedPackId(pack._id);
    setSelectedRoute(null);
    setIsRouteActive(false);
  };

  const handleSelectRoute = (route) => {
    setSelectedRoute(route);
    setIsRouteActive(false);
    setShowMap(true);
  };

  const handleBackFromRoutes = () => {
    setSelectedPackId('');
    setSelectedRoute(null);
    setIsRouteActive(false);
  };

  const handleBackToRoutes = () => {
    setSelectedRoute(null);
    setIsRouteActive(false);
  };

  const handleStartRoute = () => {
    setIsRouteActive(true);
    setShowMap(true);
  };

  const handleToggleFavorite = async (routeId) => {
    await toggleFavoriteRoute(routeId);
  };

  const handleUseMyLocation = () => {
    if (!userLocation) {
      toast.error('Сначала разрешите геолокацию в браузере');
      return;
    }

    setRouteOrigin(userLocation);
    toast.success('Маршрут начинается от вашего местоположения');
  };

  const handleClearMyLocation = () => {
    setRouteOrigin(null);
    toast.success('Маршрут снова начинается с первой точки');
  };

  const view = isRouteActive ? 'active' : selectedRoute ? 'plan' : selectedRoutePack || !publicRoutePacks.length ? 'routes' : 'packs';

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Маршруты</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Подборки и прогулки без перегруза</h2>
          </div>
          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {publicRoutePacks.length ? `${publicRoutePacks.length} подборки` : `${routes.length} маршрутов`}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {themeButtons.map((button) => (
            <button
              key={button.id}
              onClick={() => setActiveTheme(button.id)}
              className={`rounded-full border px-3 py-2 text-sm transition ${
                activeTheme === button.id ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {button.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Поиск по маршрутам"
          className="mt-4 w-full rounded-[1.2rem] border border-slate-200 px-4 py-3 text-sm"
          value={routeQuery}
          onChange={(event) => startFiltering(() => setRouteQuery(event.target.value))}
        />
      </section>

      {view === 'packs' && (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6" data-testid="route-packs-section">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Стартовая витрина</p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">Выберите подборку под настроение</h3>
            </div>
          </div>

          {loadingRoutePacks ? (
            <p className="mt-4 text-sm text-slate-500">Собираем подборки прогулок...</p>
          ) : publicRoutePacks.length ? (
            <div className="mt-5">
              <RoutePackList packs={publicRoutePacks} selectedPackId={selectedPackId} onSelectPack={handleSelectRoutePack} />
            </div>
          ) : (
            <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              Пока нет опубликованных подборок, поэтому ниже откроется прямой список маршрутов.
            </div>
          )}
        </section>
      )}

      {view === 'routes' && (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                {selectedRoutePack ? 'Подборка' : 'Каталог'}
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">
                {selectedRoutePack ? selectedRoutePack.name : 'Все маршруты'}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {selectedRoutePack?.description || 'Откройте маршрут и сначала посмотрите весь план перед стартом.'}
              </p>
            </div>
            {selectedRoutePack && (
              <button
                type="button"
                onClick={handleBackFromRoutes}
                className="rounded-[1rem] border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                К подборкам
              </button>
            )}
          </div>

          {selectedRoutePack?.promise && (
            <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {selectedRoutePack.promise}
            </div>
          )}

          <div className="mt-5">
            <RouteList
              routes={filteredRoutes}
              loading={loadingRoutes}
              selectedRouteId={selectedRoute?._id}
              favoriteRouteIds={Array.from(favoriteRouteIds)}
              onSelectRoute={handleSelectRoute}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        </section>
      )}

      {view === 'plan' && (
        <RoutePlanSheet
          route={selectedRoute}
          points={selectedRoutePoints}
          pointMeta={pointMeta}
          routePreview={routePreview}
          routePreviewLoading={routePreviewLoading}
          mapConfig={mapConfig}
          routeOrigin={routeOrigin}
          userLocation={userLocation}
          onUseMyLocation={handleUseMyLocation}
          onClearStartPoint={handleClearMyLocation}
          onBack={handleBackToRoutes}
          onStartRoute={handleStartRoute}
        />
      )}

      {view === 'active' && (
        <ActiveRoutePanel
          route={selectedRoute}
          points={selectedRoutePoints}
          currentPoint={currentPoint}
          nextPoint={nextPoint}
          scannedPointIds={scannedPointIds}
          showMap={showMap}
          onToggleMap={() => setShowMap((current) => !current)}
          onBackToPlan={() => setIsRouteActive(false)}
          routePreview={routePreview}
          mapConfig={mapConfig}
          routeOrigin={routeOrigin}
          userLocation={userLocation}
          onScanSuccess={() => {}}
        />
      )}
    </div>
  );
};

export default Home;
