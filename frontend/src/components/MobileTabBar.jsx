import React from 'react';
import { NavLink } from 'react-router-dom';

const tabs = [
  {
    to: '/',
    label: 'Маршруты',
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M6 18.5L4 6.5l5 1.6 6-2.2 5 1.6v12l-5-1.6-6 2.2-3-.96"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  },
  {
    to: '/rewards',
    label: 'Награды',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M7 4h10v3a5 5 0 01-10 0V4zm1.5 10h7L17 20l-5-2-5 2 1.5-6z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  },
  {
    to: '/profile',
    label: 'Профиль',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
];

const MobileTabBar = () => {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-4" aria-label="Основная навигация">
      <div className="pointer-events-auto flex w-full max-w-md items-center justify-between rounded-[1.75rem] border border-white/70 bg-white/92 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[1.2rem] px-3 py-3 text-sm font-medium transition ${
                isActive ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileTabBar;
