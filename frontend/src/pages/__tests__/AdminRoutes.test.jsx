import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import AdminRoutes from '../AdminRoutes';
import api from '../../utils/api';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../components/YandexMap', () => () => <div data-testid="map-placeholder" />);

const ROUTES = [
  {
    _id: 'route-1',
    name: 'Historic Loop',
    description: 'Downtown landmarks',
    category: 'История',
    image: '',
    points: []
  }
];

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('AdminRoutes', () => {
  let container;
  let root;

  beforeAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    window.scrollTo = jest.fn();

    api.get.mockImplementation((url) => {
      if (url === '/routes') return Promise.resolve({ data: ROUTES });
      if (url === '/config') return Promise.resolve({ data: { mapKey: '' } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.clearAllMocks();
  });

  const renderPage = async (initialEntry) => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AdminRoutes />
        </MemoryRouter>
      );
    });

    await flushPromises();
    await flushPromises();
  };

  it('loads the selected route from the query string', async () => {
    await renderPage('/admin/routes?routeId=route-1');

    const nameInput = container.querySelector('input[placeholder="Например, Сердце Рязани"]');
    expect(nameInput).not.toBeNull();
    expect(nameInput.value).toBe('Historic Loop');
    expect(container.textContent).toContain('Редактирование маршрута');
  });

  it('keeps the editor empty when opened in new mode', async () => {
    await renderPage('/admin/routes?new=1');

    const nameInput = container.querySelector('input[placeholder="Например, Сердце Рязани"]');
    expect(nameInput).not.toBeNull();
    expect(nameInput.value).toBe('');
    expect(container.textContent).toContain('Новый маршрут');
  });
});
