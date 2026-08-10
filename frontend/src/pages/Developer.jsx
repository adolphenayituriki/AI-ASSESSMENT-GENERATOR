import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Globe, Github, Code2, FolderKanban, GraduationCap, ExternalLink, ArrowLeft } from 'lucide-react';

const developer = {
  name: 'Nayituriki Adolphe',
  role: 'BIT Student · Backend Developer',
  location: 'Kigali, Rwanda',
  email: 'www.nayituriki.com@gmail.com',
  phone: '+250 780 505 948',
  portfolio: 'adolpheict.vercel.app',
  github: 'github.com/adolphenayituriki',
  statement:
    'A highly motivated student at the University of Rwanda pursuing a Bachelor in Business Information Technology (BIT Level 3), passionate about using technology and innovation to solve real-world problems. Skilled in web development, Microsoft Office, Google tools and graphic design, I bring creativity, discipline and a results-driven mindset to every project. My goal is to grow into a leading professional who bridges technology with impact.',
  skills: [
    'React',
    'Node.js',
    'JavaScript',
    'HTML & CSS',
    'PHP & MySQL',
    'WordPress',
    'Product Management',
    'Graphic Design',
    'Microsoft Office',
    'Online Marketing',
  ],
  projects: [
    { name: 'CS HUB', text: 'Computer support & ICT skills website. Digital skills, computer repair and software installation across Rwanda.' },
    { name: 'Umuganda Tracking System', text: 'Full-stack attendance & fines tracking system built with HTML, JavaScript, PHP and MySQL.' },
    { name: 'MindSpace', text: 'Mental health, relationship and life-transition support that is anonymous and culturally grounded.' },
    { name: 'Kaina Fresh LTD', text: 'E-commerce website that lets customers browse products and place orders.' },
  ],
};

export default function Developer() {
  return (
    <section className="bg-brand-green-deep py-14 sm:py-20">
      <div className="container-page">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-100/80 transition hover:text-brand-gold">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="mx-auto mt-6 max-w-2xl text-center">
          <p className="eyebrow text-brand-gold">Behind the scenes</p>
          <h1 className="font-display mt-2 text-3xl font-bold text-white sm:text-4xl">Meet the developer</h1>
          <p className="mt-2 text-sm text-emerald-100/70">
            The person building this tool — a student who loves using technology to make life easier.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          {/* Identity card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center lg:col-span-2">
            <img
              src="/adolphe.jpg"
              alt={developer.name}
              className="mx-auto h-28 w-28 rounded-full object-cover shadow-lg ring-4 ring-brand-gold/60"
            />
            <h2 className="mt-4 text-lg font-bold text-white">{developer.name}</h2>
            <p className="mt-1 text-[13px] font-medium text-brand-gold">{developer.role}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-emerald-100/80">{developer.statement}</p>

            <div className="mt-6 space-y-2 text-left">
              <a href={`mailto:${developer.email}`} className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2 text-[12px] text-emerald-100/90 transition hover:bg-white/10 hover:text-white">
                <Mail className="h-4 w-4 shrink-0 text-brand-gold" /> <span className="min-w-0 break-all">{developer.email}</span>
              </a>
              <a href={`tel:${developer.phone.replace(/\s+/g, '')}`} className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2 text-[12px] text-emerald-100/90 transition hover:bg-white/10 hover:text-white">
                <Phone className="h-4 w-4 shrink-0 text-brand-gold" /> {developer.phone}
              </a>
              <span className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2 text-[12px] text-emerald-100/90">
                <MapPin className="h-4 w-4 shrink-0 text-brand-gold" /> {developer.location}
              </span>
              <a href={`https://${developer.portfolio}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2 text-[12px] text-emerald-100/90 transition hover:bg-white/10 hover:text-white">
                <Globe className="h-4 w-4 shrink-0 text-brand-gold" /> {developer.portfolio}
                <ExternalLink className="ml-auto h-3.5 w-3.5 text-emerald-100/40" />
              </a>
              <a href={`https://${developer.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2 text-[12px] text-emerald-100/90 transition hover:bg-white/10 hover:text-white">
                <Github className="h-4 w-4 shrink-0 text-brand-gold" /> {developer.github}
                <ExternalLink className="ml-auto h-3.5 w-3.5 text-emerald-100/40" />
              </a>
            </div>
          </div>

          {/* Skills + projects + education */}
          <div className="space-y-6 lg:col-span-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-brand-gold" />
                <h3 className="text-sm font-bold text-white">Skills</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {developer.skills.map((s) => (
                  <span key={s} className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-brand-gold" />
                <h3 className="text-sm font-bold text-white">Selected projects</h3>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {developer.projects.map((p) => (
                  <div key={p.name} className="rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10">
                    <p className="text-[13px] font-bold text-brand-gold">{p.name}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-emerald-100/75">{p.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-brand-gold" />
                <h3 className="text-sm font-bold text-white">Education</h3>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-emerald-100/80">
                Bachelor in Business Information Technology — University of Rwanda (expected graduation: October 2027).
                Advanced Diploma in Mathematics, Economics & Geography — G.S N.D.B.C KINYABABA.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
