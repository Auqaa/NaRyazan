import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PublicMobileLayout } from '../App';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

describe('Public mobile shell', () => {
  let container;
  let root;
  let consoleWarnSpy;

  beforeAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    useAuth.mockReturnValue({
      user: {
        name: 'Тестовый пользователь',
        balance: 42
      }
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    consoleWarnSpy.mockRestore();
    jest.clearAllMocks();
  });

  const renderLayout = async (initialEntry = '/') => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/" element={<PublicMobileLayout />}>
              <Route index element={<div data-testid="routes-view">routes</div>} />
              <Route path="rewards" element={<div data-testid="rewards-view">rewards</div>} />
              <Route path="profile" element={<div data-testid="profile-view">profile</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    });
  };

  it('renders the three-tab mobile navigation', async () => {
    await renderLayout('/');

    expect(container.textContent).toContain('Маршруты');
    expect(container.textContent).toContain('Награды');
    expect(container.textContent).toContain('Профиль');
    expect(container.querySelector('[data-testid="routes-view"]')).not.toBeNull();
  });

  it('marks rewards as active on the rewards route', async () => {
    await renderLayout('/rewards');

    const rewardsLink = Array.from(container.querySelectorAll('a')).find((node) => node.textContent.includes('Награды'));
    expect(rewardsLink?.getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('[data-testid="rewards-view"]')).not.toBeNull();
  });
});
