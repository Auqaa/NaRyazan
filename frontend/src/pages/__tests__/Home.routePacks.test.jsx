import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import Home from '../Home';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { getPointsOffline, getRoutesOffline, savePointsOffline, saveRoutesOffline } from '../../utils/offlineStorage';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../utils/offlineStorage', () => ({
  getPointsOffline: jest.fn(),
  getRoutesOffline: jest.fn(),
  savePointsOffline: jest.fn(),
  saveRoutesOffline: jest.fn()
}));

jest.mock('../../components/RoutePackList', () => ({ packs = [], onSelectPack }) => (
  <div data-testid="route-pack-list">
    {packs.map((pack) => (
      <button key={pack._id} type="button" data-testid={`route-pack-card-${pack._id}`} onClick={() => onSelectPack?.(pack)}>
        {pack.name}
      </button>
    ))}
  </div>
));

jest.mock('../../components/RouteList', () => ({ routes = [], onSelectRoute }) => (
  <div data-testid="route-list">
    {routes.map((route) => (
      <button key={route._id} type="button" data-testid={`route-button-${route._id}`} onClick={() => onSelectRoute?.(route)}>
        {route.name}
      </button>
    ))}
  </div>
));

jest.mock('../../components/RoutePlanSheet', () => ({ route, onBack, onStartRoute }) => (
  <div data-testid="route-plan-sheet">
    <div>{route.name}</div>
    <button type="button" data-testid="route-plan-back" onClick={onBack}>
      back
    </button>
    <button type="button" data-testid="route-plan-start" onClick={onStartRoute}>
      start
    </button>
  </div>
));

jest.mock('../../components/ActiveRoutePanel', () => ({ route, onBackToPlan }) => (
  <div data-testid="active-route-panel">
    <div>{route.name}</div>
    <button type="button" data-testid="active-route-back" onClick={onBackToPlan}>
      plan
    </button>
  </div>
));

const ROUTES = [
  {
    _id: 'route-1',
    name: 'Historic Loop',
    description: 'Downtown landmarks',
    themes: ['history'],
    points: [],
    pointCount: 0,
    distanceKm: 2.4,
    durationMinutes: 45
  },
  {
    _id: 'route-2',
    name: 'River Walk',
    description: 'Quiet river route',
    themes: ['water'],
    points: [],
    pointCount: 0,
    distanceKm: 3.1,
    durationMinutes: 55
  }
];

const ROUTE_PACKS = [
  {
    _id: 'pack-1',
    name: 'First Day',
    description: 'A curated first walk',
    promise: 'See the essentials without rushing',
    featured: true,
    routes: [
      { routeId: 'route-1', role: 'primary', reason: 'Best default', order: 1 },
      { routeId: 'route-2', role: 'alternative', reason: 'Quieter option', order: 2 }
    ]
  }
];

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('Home mobile route flow', () => {
  let container;
  let root;
  let consoleErrorSpy;

  beforeAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true
    });

    useAuth.mockReturnValue({
      user: {
        favoriteRoutes: [],
        savedRoutes: [],
        scannedPoints: []
      },
      toggleFavoriteRoute: jest.fn()
    });

    getPointsOffline.mockResolvedValue([]);
    getRoutesOffline.mockResolvedValue([]);
    savePointsOffline.mockResolvedValue();
    saveRoutesOffline.mockResolvedValue();
    api.post.mockResolvedValue({ data: { geometry: [], distanceMeters: 0, durationSeconds: 0 } });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  const renderHome = async () => {
    await act(async () => {
      root.render(<Home />);
    });

    await flushPromises();
    await flushPromises();
  };

  it('starts from route packs and then opens routes inside the selected pack', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/points') return Promise.resolve({ data: [] });
      if (url === '/routes') return Promise.resolve({ data: ROUTES });
      if (url === '/route-packs') return Promise.resolve({ data: ROUTE_PACKS });
      if (url === '/config') return Promise.resolve({ data: { mapKey: '', center: { lat: 54.6, lng: 39.7 } } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    await renderHome();

    expect(container.querySelector('[data-testid="route-pack-list"]')).not.toBeNull();

    await act(async () => {
      Simulate.click(container.querySelector('[data-testid="route-pack-card-pack-1"]'));
    });

    expect(container.querySelector('[data-testid="route-list"]')).not.toBeNull();
    expect(container.textContent).toContain('First Day');
  });

  it('opens route plan first and only then switches to active route', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/points') return Promise.resolve({ data: [] });
      if (url === '/routes') return Promise.resolve({ data: ROUTES });
      if (url === '/route-packs') return Promise.resolve({ data: ROUTE_PACKS });
      if (url === '/config') return Promise.resolve({ data: { mapKey: '', center: { lat: 54.6, lng: 39.7 } } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    await renderHome();

    await act(async () => {
      Simulate.click(container.querySelector('[data-testid="route-pack-card-pack-1"]'));
    });

    await act(async () => {
      Simulate.click(container.querySelector('[data-testid="route-button-route-2"]'));
    });

    expect(container.querySelector('[data-testid="route-plan-sheet"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="active-route-panel"]')).toBeNull();

    await act(async () => {
      Simulate.click(container.querySelector('[data-testid="route-plan-start"]'));
    });

    expect(container.querySelector('[data-testid="active-route-panel"]')).not.toBeNull();
  });

  it('falls back to direct route list when route packs are unavailable', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/points') return Promise.resolve({ data: [] });
      if (url === '/routes') return Promise.resolve({ data: ROUTES });
      if (url === '/route-packs') return Promise.reject(new Error('route packs unavailable'));
      if (url === '/config') return Promise.resolve({ data: { mapKey: '', center: { lat: 54.6, lng: 39.7 } } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    await renderHome();

    expect(container.querySelector('[data-testid="route-list"]')).not.toBeNull();
    expect(container.textContent).toContain('Все маршруты');
  });
});
