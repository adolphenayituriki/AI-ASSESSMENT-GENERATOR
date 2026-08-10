import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, LogIn, Eye, EyeOff, ShieldCheck, GraduationCap, ArrowLeft, UserPlus, Mail } from 'lucide-react';
import Spinner from '../components/Spinner';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorMessage, roleHome } from '../utils/helpers';

const roleHints = [
  { icon: ShieldCheck, label: 'School Leader', text: 'Full access to every teacher assessment' },
  { icon: GraduationCap, label: 'Teacher', text: 'Generate & manage your own assessments' },
];

const glassInput =
  'w-full rounded-lg border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm text-white shadow-inner shadow-black/5 placeholder-white/50 transition hover:border-white/30 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30 focus:outline-none';
const glassLabel = 'mb-1.5 block text-[13px] font-medium text-white/70';

export default function Login() {
  const { login, register, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai_username');
      if (saved) setIdentifier(saved);
    } catch {}
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await login(identifier, password);
      try {
        localStorage.setItem('ai_username', identifier);
      } catch {}
      toast.success(`Welcome back, ${res.user.name || res.user.role}.`);
      navigate(roleHome(res.user.role));
    } catch (err) {
      toast.error(errorMessage(err, 'Login failed. Please check your credentials.'));
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    try {
      const res = await register({ name, username, email, password: newPassword });
      toast.success(`Welcome, ${res.user.name || res.user.role}! Your account is ready.`);
      navigate(roleHome(res.user.role));
    } catch (err) {
      toast.error(errorMessage(err, 'Sign up failed. Please try again.'));
    }
  };

  return (
    <section className="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-brand-green-deep px-3 py-6 sm:px-4 sm:py-10">
      {/* Glassmorphism backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-green-deep via-brand-green-dark to-emerald-900" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <video
          className="ken-burns h-full w-full object-cover opacity-25 mix-blend-screen"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        >
          <source
            src="/videos/Hailuo_Video_create a video as background v_543345892747853830 (3).mp4"
            type="video/mp4"
          />
        </video>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.10),transparent_45%)]" />
      <div className="bg-drift pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-brand-gold/20 blur-3xl" />
      <div className="bg-drift pointer-events-none absolute -bottom-32 -left-20 h-[26rem] w-[26rem] rounded-full bg-emerald-400/15 blur-3xl" style={{ animationDelay: '-9s' }} />
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />

      <div className="fade-up relative w-full max-w-4xl">
        <div className="grid overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:grid-cols-2">
          {/* Brand panel */}
          <div className="relative hidden flex-col justify-between border-r border-white/10 bg-white/5 p-7 text-white lg:flex">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-gold/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="relative">
              <BrandLogo size={56} className="mb-4 ring-white/20" />
              <h1 className="font-display text-xl font-bold text-white">DuFast EduAi</h1>
              <p className="mt-0.5 text-[13px] text-emerald-100/80">
                Turn your course notes into Quiz-test-exam-Homework-ready papers in seconds.
              </p>
            </div>
            <div className="relative space-y-2">
              {roleHints.map((r) => (
                <div key={r.label} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 p-2.5 backdrop-blur-md">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-gold">
                    <r.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">{r.label}</p>
                    <p className="truncate text-[11px] text-emerald-100/70">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form panel */}
          <div className="bg-white/5 p-4 backdrop-blur-xl sm:p-7">
            <div className="mb-5 lg:hidden">
              <BrandLogo size={48} className="mb-2.5 ring-white/20" />
              <h1 className="font-display text-lg font-bold text-white">DuFast EduAi</h1>
              <p className="mt-0.5 text-sm text-emerald-100/70">Staff sign in</p>
            </div>

            <div key={mode} className={mode === 'signin' ? 'form-enter-left' : 'form-enter-right'}>
              <h2 className="hidden font-display text-xl font-bold text-white lg:block">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="mt-0.5 hidden text-sm text-emerald-100/70 lg:block">
                {mode === 'signin' ? 'Sign in to generate assessments.' : 'Sign up to start generating assessments.'}
              </p>
            </div>

            <div className="mt-4 mb-4 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/10 p-1 backdrop-blur-md">
              {[
                { key: 'signin', label: 'Sign In' },
                { key: 'signup', label: 'Create Account' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setMode(t.key)}
                  className={`rounded-lg px-2 py-2 text-[11px] font-bold transition sm:px-3 sm:text-xs ${
                    mode === t.key
                      ? 'bg-white/20 text-white shadow-md shadow-black/20'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {mode === 'signin' ? (
              <form key="signin-form" onSubmit={handleSubmit} className="form-enter-left space-y-3">
                <div>
                  <label className={glassLabel}>Username or Email</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      autoFocus
                      autoComplete="username"
                      placeholder="teacher"
                      className={`${glassInput} pl-10`}
                    />
                  </div>
                </div>

                <div>
                  <label className={glassLabel}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={`${glassInput} pl-10 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 transition-colors hover:text-white"
                      aria-label="Toggle password visibility"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-gold to-amber-500 px-5 py-2.5 text-sm font-bold text-brand-green-deep shadow-lg shadow-brand-gold/25 transition-all duration-200 hover:-translate-y-px hover:shadow-xl hover:shadow-brand-gold/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:translate-y-0 disabled:opacity-60"
                >
                  {loading ? <Spinner size="sm" /> : <LogIn className="h-4 w-4" />}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form key="signup-form" onSubmit={handleSignUp} className="form-enter-right space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={glassLabel}>Full name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoFocus
                        autoComplete="name"
                        placeholder="Full name"
                        className={`${glassInput} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={glassLabel}>Username</label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      placeholder="Username"
                      className={glassInput}
                    />
                  </div>
                </div>

                <div>
                  <label className={glassLabel}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="you@school.ac.rw"
                      className={`${glassInput} pl-10`}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={glassLabel}>Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        className={`${glassInput} pl-10 pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 transition-colors hover:text-white"
                        aria-label="Toggle password visibility"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={glassLabel}>Confirm password</label>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      className={glassInput}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-gold to-amber-500 px-5 py-2.5 text-sm font-bold text-brand-green-deep shadow-lg shadow-brand-gold/25 transition-all duration-200 hover:-translate-y-px hover:shadow-xl hover:shadow-brand-gold/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:translate-y-0 disabled:opacity-60"
                >
                  {loading ? <Spinner size="sm" /> : <UserPlus className="h-4 w-4" />}
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
                <p className="text-center text-[11px] text-white/50">
                  Creates a Teacher account. Leaders and admins are set up by the administrator.
                </p>
              </form>
            )}

            {mode === 'signin' && (
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/15" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Staff access</span>
                <span className="h-px flex-1 bg-white/15" />
              </div>
            )}

            <Link to="/" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-gold hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
