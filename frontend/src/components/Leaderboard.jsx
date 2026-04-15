import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const res = await api.get('/users/leaderboard');
        setLeaders(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLeaders();
  }, []);

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Лидерборд</p>
          <h3 className="mt-2 text-xl font-bold text-slate-950">Кто сейчас впереди</h3>
        </div>
      </div>
      <ul className="mt-5 divide-y divide-slate-100">
        {leaders.map((user, idx) => (
          <li key={user._id} className="flex items-center justify-between gap-3 py-3">
            <span className="text-sm text-slate-700">
              {idx + 1}. {user.name}
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">{user.balance} баллов</span>
          </li>
        ))}
        {!leaders.length && <li className="py-2 text-sm text-slate-500">Лидерборд загрузится, как только сервер вернёт участников.</li>}
      </ul>
    </div>
  );
};

export default Leaderboard;
