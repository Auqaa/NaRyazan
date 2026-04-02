import React from 'react';
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/admin', label: 'Главная', end: true },
  { to: '/admin/routes', label: 'Маршруты' },
  { to: '/admin/packs', label: 'Подборки' }
];

const AdminSectionTabs = ({ className = '', orientation = 'horizontal' }) => {
  const shellClasses =
    orientation === 'vertical'
      ? 'flex flex-col gap-2 rounded-[1.5rem] border border-white/10 bg-white/5 p-2'
      : 'inline-flex flex-wrap gap-2 rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm';

  return (
    <div className={className}>
      <div className={shellClasses}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `${
                orientation === 'vertical' ? 'rounded-[1.1rem]' : 'rounded-full'
              } px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : orientation === 'vertical'
                    ? 'text-slate-200 hover:bg-white/10'
                    : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default AdminSectionTabs;
