import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import AdminHome from '../AdminHome';
import api from '../../utils/api';
import toast from 'react-hot-toast';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn()
  }
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn()
  }
}));

const STORAGE_KEY = 'na-ryazan.admin.workspace.history';

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('AdminHome', () => {
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
    localStorage.clear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  const renderPage = async () => {
    await act(async () => {
      root.render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AdminHome />
        </MemoryRouter>
      );
    });

    await flushPromises();
    await flushPromises();
  };

  it('shows quick actions and filters stale recent work entries', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          type: 'route',
          entityId: 'route-1',
          label: 'Historic Loop',
          href: '/admin/routes?routeId=route-1',
          touchedAt: 2
        },
        {
          type: 'pack',
          entityId: 'pack-stale',
          label: 'Old Pack',
          href: '/admin/packs?packId=pack-stale',
          touchedAt: 1
        }
      ])
    );

    api.get.mockImplementation((url) => {
      if (url === '/routes') return Promise.resolve({ data: [{ _id: 'route-1', name: 'Historic Loop', description: 'Old town' }] });
      if (url === '/route-packs/admin') return Promise.resolve({ data: [{ _id: 'pack-1', name: 'River Evening', status: 'draft', promise: 'A calm river walk' }] });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    await renderPage();

    expect(container.querySelector('a[href="/admin/routes?new=1"]')).not.toBeNull();
    expect(container.querySelector('a[href="/admin/packs?new=1"]')).not.toBeNull();
    expect(container.textContent).toContain('Historic Loop');
    expect(container.textContent).not.toContain('Old Pack');
  });

  it('shows an error toast when admin home data fails to load', async () => {
    api.get.mockRejectedValue(new Error('boom'));

    await renderPage();

    expect(toast.error).toHaveBeenCalled();
  });
});
