import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LogOut, LogIn } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Spinner from './components/Spinner';
import BrandLogo from './components/BrandLogo';

import Login from './pages/Login';
import Landing from './pages/Landing';
import Developer from './pages/Developer';
import AIExam from './pages/staff/AIExam';
import { roleHome, roleLabel } from './utils/helpers';

function RoleRoute({ roles, children }) {
  const { user, checking } = useAuth();
  if (checking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

function TopBar() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <BrandLogo size={36} />
          <div>
            <p className="font-display text-sm font-bold leading-tight text-slate-900">DuFast EduAi</p>
            <p className="text-[11px] leading-tight text-slate-400">Upload notes → generate a real exam → download</p>
          </div>
        </div>
        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-slate-800">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{roleLabel(user.role)}</p>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
            >
              <LogOut className="h-3.5 w-3.5" /> Log out
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn-primary !px-4 !py-2">
            <LogIn className="h-4 w-4" /> Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const isLogin = pathname === '/login';

  return (
    <div className="flex min-h-screen flex-col">
      {!isLogin && <TopBar />}
      <main className="flex-1">
        <div className="page-fade">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Landing />} />
            <Route path="/developer" element={<Developer />} />
            <Route
              path="/app"
              element={
                <RoleRoute roles={['teacher', 'leader', 'admin']}>
                  <div className="container-page py-6 sm:py-8">
                    <AIExam />
                  </div>
                </RoleRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
