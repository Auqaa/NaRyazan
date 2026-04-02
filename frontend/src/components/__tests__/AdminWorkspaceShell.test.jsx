import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminWorkspaceShell from '../AdminWorkspaceShell';
import { useAdminWorkspace } from '../../contexts/AdminWorkspaceContext';

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const RoutePage = () => {
  const { setMetadata } = useAdminWorkspace();

  useEffect(() => {
    setMetadata({
      eyebrow: 'Маршруты',
      title: 'Route Detail',
      description: 'Testing route shell metadata',
      stats: [{ label: 'Маршрутов', value: 2 }],
      actions: [{ label: 'Новый маршрут', to: '/admin/routes?new=1' }]
    });
  }, [setMetadata]);

  return <div data-testid="route-page">Route page content</div>;
};

describe('AdminWorkspaceShell', () => {
  let container;
  let root;

  beforeAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const renderShell = async (initialEntries) => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={initialEntries} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/admin" element={<AdminWorkspaceShell />}>
              <Route index element={<div data-testid="admin-home-page">Admin home page</div>} />
              <Route path="routes" element={<RoutePage />} />
              <Route path="packs" element={<div data-testid="packs-page">Packs page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });

    await flushPromises();
  };

  it('renders the admin home index route inside the shell', async () => {
    await renderShell(['/admin']);

    expect(container.querySelector('[data-testid="admin-home-page"]')).not.toBeNull();
    expect(container.querySelector('a[href="/admin"][aria-current="page"]')).not.toBeNull();
    expect(container.textContent).toContain('Admin Home');
  });

  it('shows shell metadata and active section for nested routes', async () => {
    await renderShell(['/admin/routes']);

    expect(container.querySelector('[data-testid="route-page"]')).not.toBeNull();
    expect(container.querySelector('a[href="/admin/routes"][aria-current="page"]')).not.toBeNull();
    expect(container.textContent).toContain('Route Detail');
    expect(container.querySelector('a[href="/admin/routes?new=1"]')).not.toBeNull();
  });
});
