import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, LogIn, Eye, EyeOff, ShieldCheck, GraduationCap, ArrowLeft } from 'lucide-react';
import Spinner from '../components/Spinner';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorMessage, roleHome } from '../utils/helpers';

const roleHints = [
  { icon: ShieldCheck, label: 'School Leader', text: 'Full access to every teacher assessment' },
  { icon: GraduationCap, label: 'Teacher', text: 'Generate & manage your own assessments' },
];

export default function Login() {
  const { login, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

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

  return (
    <section className="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-brand-green-deep px-4 py-10">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-green-dark/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-14 h-64 w-64 rounded-full bg-brand-gold/15 blur-3xl" />

      <div className="relative w-full max-w-4xl">
        <div className="card grid overflow-hidden lg:grid-cols-2">
          {/* Brand panel */}
          <div className="relative hidden flex-col justify-between bg-brand-green-ink p-6 text-white lg:flex">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-green-dark/50 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-brand-gold/15 blur-3xl" />
            <div className="relative">
              <BrandLogo size={56} className="mb-4" />
              <h1 className="font-display text-xl font-bold text-white">DuFast EduAi</h1>
              <p className="mt-0.5 text-[13px] text-emerald-100/80">Turn your course notes into exam-ready papers</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-brand-gold">
                Quizzes · Exams · Exercises · Homework
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-emerald-100/70">
                Turn any course document into an exam-ready paper with an answer key and explanations in seconds.
                Download as a student paper, marking guide or CSV.
              </p>
            </div>
            <div className="relative space-y-2">
              {roleHints.map((r) => (
                <div key={r.label} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-gold">
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
          <div className="bg-white p-6">
            <div className="mb-5 lg:hidden">
              <BrandLogo size={48} className="mb-2.5" />
              <h1 className="font-display text-lg font-bold">DuFast EduAi</h1>
              <p className="mt-0.5 text-sm text-slate-500">Staff sign in</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-brand-green-dark">
                Quizzes · Exams · Exercises · Homework
              </p>
            </div>

            <h2 className="hidden font-display text-xl font-bold lg:block">Welcome back</h2>
            <p className="mt-0.5 hidden text-sm text-slate-500 lg:block">Sign in to generate assessments.</p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="label-field">Username or Email</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="teacher"
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="label-field">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input-field pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                {loading ? <Spinner size="sm" light /> : <LogIn className="h-4 w-4" />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Staff access</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="rounded-lg bg-brand-green-light px-4 py-2.5 text-center text-xs text-slate-600">
              Demo teacher account: <span className="font-semibold">teacher / teacher123</span>
            </p>

            <Link to="/" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green-dark hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
