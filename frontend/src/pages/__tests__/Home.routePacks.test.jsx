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

jest.mock('../../components/YandexMap', () => () => <div data-testid="map-placeholder" />);
jest.mock('../../components/QRScanner', () => () => <div data-testid="qr-scanner-placeholder" />);
jest.mock('../../components/Leaderboard', () => () => <div data-testid="leaderboard-placeholder" />);
jest.mock('../../components/Shop', () => () => <div data-testid="shop-placeholder" />);
jest.mock('../../components/AIAssistant', () => () => <div data-testid="ai-assistant-placeholder" />);
jest.mock('../../components/ShareButton', () => ({ routeName }) => <div data-testid={`share-route-name-${routeName}`} />);
jest.mock('../../components/RouteList', () => ({ routes = [], selectedRouteId, onSelectRoute }) => (
  <div data-testid="route-list">
    {routes.map((route) => (
      <button
        key={route._id}
        type="button"
        data-testid={`route-button-${route._id}`}
        data-selected={route._id === selectedRouteId ? 'true' : 'false'}
        onClick={() => onSelectRoute?.(route)}
      >
        {route.name}
      </button>
    ))}
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
    totalReward: 20,
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
    totalReward: 30,
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
    practicalNotes: 'Best for a calm afternoon',
    badges: ['90 min'],
    featured: true,
    sortOrder: 0,
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

describe('Home route packs', () => {
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
    api.post.mockReset();
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

  it('switches the selected route when a pack route is chosen', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/points') return Promise.resolve({ data: [] });
      if (url === '/routes') return Promise.resolve({ data: ROUTES });
      if (url === '/route-packs') return Promise.resolve({ data: ROUTE_PACKS });
      if (url === '/config') return Promise.resolve({ data: { mapKey: '', center: { lat: 54.6, lng: 39.7 } } });
      if (url === '/stops') return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    await renderHome();

    const packCard = container.querySelector('[data-testid="route-pack-card-pack-1"]');
    expect(packCard).not.toBeNull();

    await act(async () => {
      Simulate.click(packCard);
    });

    const chooseAlternativeButton = container.querySelector('[data-testid="route-pack-option-route-2"] button');
    expect(chooseAlternativeButton).not.toBeNull();

    await act(async () => {
      Simulate.click(chooseAlternativeButton);
    });

    expect(container.querySelector('[data-testid="share-route-name-River Walk"]')).not.toBeNull();
  });

  it('keeps routes available when route packs fail to load', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/points') return Promise.resolve({ data: [] });
      if (url === '/routes') return Promise.resolve({ data: ROUTES });
      if (url === '/route-packs') return Promise.reject(new Error('route packs unavailable'));
      if (url === '/config') return Promise.resolve({ data: { mapKey: '', center: { lat: 54.6, lng: 39.7 } } });
      if (url === '/stops') return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    await renderHome();

    expect(container.querySelector('[data-testid="route-list"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="route-packs-section"]')).not.toBeNull();
    expect(container.textContent).toContain('Пока нет опубликованных сценариев');
  });
});
