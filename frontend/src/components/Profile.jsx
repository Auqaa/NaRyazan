import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const {
    user,
    updateProfile,
    requestVerification,
    verifyContact,
    logout,
    hasGuideWorkspaceAccess,
    hasEditorialAccess
  } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [hideFromLeaderboard, setHideFromLeaderboard] = useState(Boolean(user?.hideFromLeaderboard));
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');

  const savedRoutes = useMemo(() => user?.savedRoutes || user?.favoriteRoutes || [], [user]);

  if (!user) {
    return <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">Загрузка профиля...</div>;
  }

  const handleProfileSave = async (event) => {
    event.preventDefault();
    await updateProfile({ name, hideFromLeaderboard, avatar });
  };

  const handleRequestCode = async (channel) => {
    await requestVerification(channel, channel === 'email' ? email : phone);
  };

  const handleVerify = async (channel) => {
    const success = await verifyContact(channel, channel === 'email' ? emailCode : phoneCode);
    if (success) {
      if (channel === 'email') setEmailCode('');
      if (channel === 'phone') setPhoneCode('');
    }
  };

  const handleAvatarChange = (event) => {
    const [file] = Array.from(event.target.files || []);
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              {avatar ? (
                <img src={avatar} alt={name || user.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-slate-500">{(name || user.name || 'Н').trim().charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Профиль</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{name || user.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:w-auto">
            <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Баланс</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{user.balance} баллов</div>
            </div>
            <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Маршрутов</div>
              <div className="mt-2 text-lg font-semibold text-slate-950">{savedRoutes.length} сохранено</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleProfileSave} className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-lg font-bold text-slate-950">Личные данные и настройки</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Имя</label>
              <input
                type="text"
                className="w-full rounded-[1rem] border border-slate-200 px-4 py-3"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Имя"
              />
            </div>

            <div className="rounded-[1.4rem] border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-800">Аватар</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-black">
                  Загрузить фото
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    className="rounded-[1rem] border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Убрать фото
                  </button>
                )}
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={hideFromLeaderboard}
                onChange={(event) => setHideFromLeaderboard(event.target.checked)}
              />
              Показывать меня в лидерборде
            </label>

            <button type="submit" className="rounded-[1rem] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black">
              Сохранить профиль
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="text-lg font-bold text-slate-950">Рабочие панели</h3>
            <div className="mt-4 space-y-3">
              {hasGuideWorkspaceAccess && (
                <Link to="/guide" className="block rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                  Перейти в панель гида
                </Link>
              )}
              {hasEditorialAccess && (
                <Link to="/admin" className="block rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                  Перейти в админ-панель
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="w-full rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-4 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Выйти из аккаунта
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="text-lg font-bold text-slate-950">Подтверждение контактов</h3>
            <div className="mt-4 space-y-4">
              <div className="rounded-[1.4rem] border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <strong>E-mail</strong>
                  <span className={user.verification?.email?.verified ? 'text-sm text-emerald-600' : 'text-sm text-amber-600'}>
                    {user.verification?.email?.verified ? 'Подтверждён' : 'Не подтверждён'}
                  </span>
                </div>
                <input
                  type="email"
                  className="w-full rounded-[1rem] border border-slate-200 px-4 py-3"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Введите e-mail"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleRequestCode('email')} className="rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-black">
                    Получить код
                  </button>
                  <input
                    type="text"
                    className="min-w-[160px] flex-1 rounded-[1rem] border border-slate-200 px-4 py-3"
                    value={emailCode}
                    onChange={(event) => setEmailCode(event.target.value)}
                    placeholder="Код подтверждения"
                  />
                  <button type="button" onClick={() => handleVerify('email')} className="rounded-[1rem] border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                    Подтвердить
                  </button>
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <strong>Телефон</strong>
                  <span className={user.verification?.phone?.verified ? 'text-sm text-emerald-600' : 'text-sm text-amber-600'}>
                    {user.verification?.phone?.verified ? 'Подтверждён' : 'Не подтверждён'}
                  </span>
                </div>
                <input
                  type="tel"
                  className="w-full rounded-[1rem] border border-slate-200 px-4 py-3"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+7..."
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleRequestCode('phone')} className="rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-black">
                    Получить код
                  </button>
                  <input
                    type="text"
                    className="min-w-[160px] flex-1 rounded-[1rem] border border-slate-200 px-4 py-3"
                    value={phoneCode}
                    onChange={(event) => setPhoneCode(event.target.value)}
                    placeholder="Код подтверждения"
                  />
                  <button type="button" onClick={() => handleVerify('phone')} className="rounded-[1rem] border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                    Подтвердить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-lg font-bold text-slate-950">Сохранённые маршруты</h3>
          <div className="mt-4 space-y-2">
            {savedRoutes.length ? (
              savedRoutes.map((route) => (
                <Link key={route._id} to="/" className="block rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">
                  <strong className="text-slate-900">{route.name}</strong>
                  <p className="mt-1 text-sm text-slate-500">{route.description}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-600">Пока нет сохранённых маршрутов.</p>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-lg font-bold text-slate-950">Пройденные маршруты</h3>
          <div className="mt-4 space-y-2">
            {(user.completedRoutes || []).length ? (
              user.completedRoutes.map((route) => (
                <div key={route._id || route} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <strong className="text-slate-900">{route.name || route}</strong>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">Вы ещё не завершили ни одного маршрута.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
