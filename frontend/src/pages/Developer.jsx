import { Link } from 'react-router-dom';
import { Mail, Globe, Github, ExternalLink, ArrowLeft, ArrowUpRight } from 'lucide-react';

const developer = {
  name: 'Nayituriki Adolphe',
  role: 'BIT Student · Backend Developer',
  email: 'www.nayituriki.com@gmail.com',
  portfolio: 'adolpheict.vercel.app',
  github: 'github.com/adolphenayituriki',
  statement:
    'A student at the University of Rwanda pursuing a Bachelor in Business Information Technology, who loves using technology to make life easier. I build web applications, work with databases and enjoy design. Always aiming to bridge technology with real-world impact.',
};

export default function Developer() {
  return (
    <section className="bg-gradient-to-br from-brand-green-ink via-brand-green-deep to-brand-green-dark py-14 sm:py-20">
      <div className="container-page">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 transition hover:text-brand-gold">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="mx-auto mt-6 max-w-2xl text-center">
          <p className="text-lg font-semibold text-brand-gold">Behind the scenes</p>
          <h1 className="font-display mt-2 text-3xl font-bold text-white sm:text-4xl">Meet the developer</h1>
          <p className="mt-2 text-sm text-white/70">
            The person building this tool. A student who loves using technology to make life easier.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
          <img
            src="/adolphe.jpg"
            alt={developer.name}
            className="mx-auto h-28 w-28 rounded-full object-cover shadow-lg ring-4 ring-brand-gold/60"
          />
          <h2 className="mt-4 text-lg font-bold text-white">{developer.name}</h2>
          <p className="mt-1 text-[13px] font-medium text-brand-gold">{developer.role}</p>
          <p className="mt-4 text-[13px] leading-relaxed text-white/75">{developer.statement}</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <a
              href={`mailto:${developer.email}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 transition hover:bg-white/20 hover:text-white"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-brand-gold" /> Email
            </a>
            <a
              href={`https://${developer.portfolio}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 transition hover:bg-white/20 hover:text-white"
            >
              <Globe className="h-3.5 w-3.5 shrink-0 text-brand-gold" /> Portfolio
              <ExternalLink className="h-3 w-3 text-white/40" />
            </a>
            <a
              href={`https://${developer.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/85 transition hover:bg-white/20 hover:text-white"
            >
              <Github className="h-3.5 w-3.5 shrink-0 text-brand-gold" /> GitHub
              <ExternalLink className="h-3 w-3 text-white/40" />
            </a>
          </div>

          <a
            href={`https://${developer.portfolio}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 px-6 py-3 text-sm font-bold text-brand-green-deep shadow-lg shadow-brand-gold/25 transition hover:-translate-y-px hover:shadow-xl hover:shadow-brand-gold/30"
          >
            Explore my full portfolio <ArrowUpRight className="h-4 w-4" />
          </a>
          <p className="mt-3 text-[11px] text-white/40">
            Skills, projects and education are showcased in the portfolio.
          </p>
        </div>
      </div>
    </section>
  );
}
