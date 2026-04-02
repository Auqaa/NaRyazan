import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import AdminRoutePacks from '../AdminRoutePacks';
import api from '../../utils/api';
import toast from 'react-hot-toast';

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

const ROUTES = [
  {
    _id: 'route-1',
    name: 'Historic Loop'
  }
];

const INITIAL_PACKS = [
  {
    _id: 'pack-existing',
    name: 'Existing Pack',
    description: 'Needs work',
    promise: 'A draft scenario',
    practicalNotes: '',
    badges: [],
    image: '',
    featured: false,
    sortOrder: 0,
    status: 'published',
    routes: [{ routeId: 'missing-route', role: 'primary', reason: '', order: 1 }],
    validation: {
      isPublishable: false,
      issues: ['Missing primary route reference']
    }
  }
];

const REFRESHED_PACKS = [
  ...INITIAL_PACKS,
  {
    _id: 'pack-created',
    name: 'New Pack',
    description: 'Fresh scenario',
    promise: 'A short first-day route',
    practicalNotes: '',
    badges: [],
    image: '',
    featured: false,
    sortOrder: 0,
    status: 'draft',
    routes: [{ routeId: 'route-1', role: 'primary', reason: '', order: 1 }],
    validation: {
      isPublishable: true,
      issues: []
    }
  }
];

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('AdminRoutePacks', () => {
  let container;
  let root;
  let adminPackResponse;

  beforeAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    adminPackResponse = INITIAL_PACKS;

    window.scrollTo = jest.fn();
    window.confirm = jest.fn(() => true);

    api.get.mockImplementation((url) => {
      if (url === '/routes') return Promise.resolve({ data: ROUTES });
      if (url === '/route-packs/admin') return Promise.resolve({ data: adminPackResponse });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    api.post.mockImplementation(async () => {
      adminPackResponse = REFRESHED_PACKS;
      return {
        data: {
          _id: 'pack-created',
          validation: { issues: [] }
        }
      };
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.clearAllMocks();
  });

  const renderPage = async (initialEntry = '/admin/packs?packId=pack-existing') => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AdminRoutePacks />
        </MemoryRouter>
      );
    });

    await flushPromises();
    await flushPromises();
  };

  it('shows existing validation issues and creates a new pack', async () => {
    await renderPage('/admin/packs?new=1');

    expect(container.textContent).toContain('Missing primary route reference');

    const nameInput = container.querySelector('[data-testid="pack-name-input"]');
    const descriptionInput = container.querySelector('textarea[name="pack-description"]');
    const promiseInput = container.querySelector('[data-testid="pack-promise-input"]');
    const routeSelect = container.querySelector('[data-testid="pack-route-select-0"]');
    const saveButton = container.querySelector('[data-testid="pack-save-button"]');

    expect(nameInput).not.toBeNull();
    expect(descriptionInput).not.toBeNull();
    expect(promiseInput).not.toBeNull();
    expect(routeSelect).not.toBeNull();
    expect(saveButton).not.toBeNull();

    await act(async () => {
      Simulate.change(nameInput, { target: { value: 'New Pack' } });
      Simulate.change(descriptionInput, { target: { value: 'Fresh scenario' } });
      Simulate.change(promiseInput, { target: { value: 'A short first-day route' } });
      Simulate.change(routeSelect, { target: { value: 'route-1' } });
    });

    await act(async () => {
      Simulate.submit(saveButton.form);
    });

    await flushPromises();
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith(
      '/route-packs/admin',
      expect.objectContaining({
        name: 'New Pack',
        description: 'Fresh scenario',
        promise: 'A short first-day route',
        status: 'draft',
        routes: [{ routeId: 'route-1', role: 'primary', reason: '', order: 1 }]
      })
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it('loads the selected pack from the query string', async () => {
    await renderPage('/admin/packs?packId=pack-existing');

    expect(container.textContent).toContain('Missing primary route reference');

    const nameInput = container.querySelector('[data-testid="pack-name-input"]');
    expect(nameInput).not.toBeNull();
    expect(nameInput.value).toBe('Existing Pack');
  });
});
