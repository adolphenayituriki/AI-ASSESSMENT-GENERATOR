import { useState } from 'react';
import { Routes, Route, Navigate, Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, LogIn, Menu, X, Users as UsersIcon, FileText } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Spinner from './components/Spinner';
import BrandLogo from './components/BrandLogo';

import Login from './pages/Login';
import Landing from './pages/Landing';
import Developer from './pages/Developer';
import AIExam from './pages/staff/AIExam';
import Users from './pages/admin/Users';
import { roleHome, roleLabel } from './utils/helpers';

const navLinkCls = ({ isActive }) =>
  `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all duration-150 ${
    isActive
      ? 'bg-brand-green-dark/10 text-brand-green-dark shadow-[inset_0_0_0_1px_rgba(7,142,206,0.15)]'
      : 'text-slate-600 hover:bg-slate-200/60 hover:text-brand-green-deep'
  }`;

const initials = (name) =>
  String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

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
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (onNavigate) => (
    <>
      <NavLink to="/app" end className={navLinkCls} onClick={onNavigate}>
        <FileText className="h-4 w-4" /> Assessments
      </NavLink>
      {user?.role === 'admin' && (
        <NavLink to="/admin/users" className={navLinkCls} onClick={onNavigate}>
          <UsersIcon className="h-4 w-4" /> User Management
        </NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/75 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-2.5">
          <BrandLogo size={40} className="ring-1 ring-slate-200/80 transition group-hover:ring-brand-green-soft" />
          <div className="leading-tight">
            <p className="font-display text-[15px] font-bold text-brand-green-deep">DuFast EduAi</p>
            <p className="hidden text-[11px] font-medium text-slate-500 sm:block">
              Upload notes → generate a real exam → download
            </p>
          </div>
        </Link>

        {user && (
          <nav className="hidden items-center gap-1 rounded-xl bg-slate-100/80 p-1 ring-1 ring-slate-200/60 md:flex" aria-label="Primary">
            {nav(null)}
          </nav>
        )}

        {user ? (
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden items-center gap-2.5 lg:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-green-dark to-brand-green text-xs font-bold text-white shadow-sm ring-2 ring-brand-green-soft">
                {initials(user.name)}
              </span>
              <div className="leading-tight">
                <p className="text-[13px] font-bold uppercase tracking-wide text-slate-900">{user.name}</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-green-dark">
                  {roleLabel(user.role)}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-3.5 w-3.5" /> Log out
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-green-soft hover:text-brand-green-dark md:hidden"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <Link to="/login" className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-gold to-amber-500 px-4 py-2 text-sm font-bold text-brand-green-deep shadow-lg shadow-brand-gold/25 transition hover:-translate-y-px hover:shadow-xl hover:shadow-brand-gold/30">
            <LogIn className="h-4 w-4" /> Sign in
          </Link>
        )}
      </div>

      {user && mobileOpen && (
        <div className="border-t border-slate-200/70 bg-white/95 px-4 pb-4 pt-3 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {nav(() => setMobileOpen(false))}
          </nav>
          <div className="mt-3 flex items-center gap-2.5 border-t border-slate-100 pt-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-green-dark to-brand-green text-xs font-bold text-white">
              {initials(user.name)}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-bold uppercase tracking-wide text-slate-900">{user.name}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-green-dark">
                {roleLabel(user.role)}
              </p>
            </div>
          </div>
        </div>
      )}
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
            <Route
              path="/admin/users"
              element={
                <RoleRoute roles={['admin']}>
                  <div className="container-page py-6 sm:py-8">
                    <Users />
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
