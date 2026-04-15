import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminHome from './pages/AdminHome';
import AdminRoutes from './pages/AdminRoutes';
import AdminRoutePacks from './pages/AdminRoutePacks';
import GuideWorkspace from './pages/GuideWorkspace';
import Profile from './components/Profile';
import RewardsHub from './components/RewardsHub';
import MobileTabBar from './components/MobileTabBar';
import AppErrorBoundary from './components/AppErrorBoundary';
import AdminWorkspaceShell from './components/AdminWorkspaceShell';
import { Toaster } from 'react-hot-toast';

const LoadingScreen = () => <div className="flex justify-center p-10">Загрузка...</div>;

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading, hasEditorialAccess } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return hasEditorialAccess ? children : <Navigate to="/" replace />;
};

const GuideRoute = ({ children }) => {
  const { user, loading, hasGuideWorkspaceAccess } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return hasGuideWorkspaceAccess ? children : <GuideWorkspace accessDenied />;
};

export const PublicMobileLayout = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-28 pt-4 sm:px-6">
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/80">НаРязань</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Городские прогулки в спокойном мобильном ритме
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Выбирайте подборку, открывайте план маршрута и проходите точки по QR-коду без перегруженного экрана.
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/80 px-4 py-3 text-right shadow-sm backdrop-blur">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Аккаунт</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{user?.name || 'Пользователь'}</div>
            <div className="text-xs text-slate-500">{user?.balance || 0} баллов</div>
          </div>
        </header>

        <div className="flex-1">
          <Outlet />
        </div>
      </div>

      <MobileTabBar />
    </div>
  );
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <PrivateRoute>
            <PublicMobileLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="rewards" element={<RewardsHub />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route
        path="/guide"
        element={
          <GuideRoute>
            <GuideWorkspace />
          </GuideRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminWorkspaceShell />
          </AdminRoute>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="routes" element={<AdminRoutes />} />
        <Route path="packs" element={<AdminRoutePacks />} />
      </Route>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}

function AppShell() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </AppErrorBoundary>
  );
}

export default App;
