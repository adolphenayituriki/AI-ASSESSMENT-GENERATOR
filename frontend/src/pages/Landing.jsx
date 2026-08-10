import { useNavigate, Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";

const features = [
  {
    fa: "fa-upload",
    title: "Upload any course notes",
    text: "PDF, DOCX or TXT — the text is extracted automatically. No long setup, no formatting needed.",
  },
  {
    fa: "fa-wand-magic-sparkles",
    title: "AI writes the paper",
    text: "Quiz, exam, exercise or homework. Real exam-style questions with an answer key and explanations.",
  },
  {
    fa: "fa-download",
    title: "Download instantly",
    text: "Student paper (PDF), marking guide (PDF) or CSV for spreadsheets and e-learning platforms.",
  },
  {
    fa: "fa-book",
    title: "Keep a library",
    text: "Every generated assessment is saved to your library so you can re-download or print anytime.",
  },
];

const steps = [
  {
    n: "1",
    fa: "fa-upload",
    title: "Upload your course document",
    text: "Choose any notes file and the text is extracted automatically. No formatting, no long setup.",
    details: [
      "PDF, DOCX or TXT",
      "Text extracted automatically",
      "Up to 30 MB per file",
    ],
  },
  {
    n: "2",
    fa: "fa-scroll",
    title: "Configure the assessment",
    text: "Tell the AI what to produce: type, question count, subject, class, difficulty, total marks and time allowed.",
    details: [
      "Quiz · Exam · Exercise · Homework",
      "Difficulty from Easy to Advanced",
      "You set the total marks, the AI weights each question",
    ],
  },
  {
    n: "3",
    fa: "fa-file-circle-check",
    title: "Generate & export",
    text: "Preview the full paper with answers and explanations, save it to your library, or export it.",
    details: [
      "Student paper (PDF)",
      "Marking guide (PDF)",
      "CSV for spreadsheets & e-learning",
    ],
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-green-deep">
        <div className="pointer-events-none absolute inset-0">
          <div className="bg-drift absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-green-dark/50 blur-3xl" />
          <div
            className="bg-drift absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-brand-green/40 blur-3xl"
            style={{ animationDelay: "-6s" }}
          />
          <div
            className="bg-drift absolute right-1/3 top-1/4 h-40 w-40 rounded-full bg-brand-gold/10 blur-3xl"
            style={{ animationDelay: "-12s" }}
          />

          <img
            src="/dufast-eduai.png"
            alt=""
            aria-hidden="true"
            className="logo-drift absolute left-2 top-[14%] h-28 w-28 rounded-2xl object-cover opacity-30 sm:left-6 sm:h-48 sm:w-48"
          />
          <img
            src="/dufast-eduaii.png"
            alt=""
            aria-hidden="true"
            className="logo-drift absolute bottom-[10%] right-2 h-32 w-32 rounded-2xl object-cover opacity-25 sm:right-6 sm:h-56 sm:w-56"
            style={{ animationDelay: "-20s" }}
          />

          <span
            className="float-icon absolute left-[8%] top-[18%] hidden px-1 py-1 md:block"
            style={{ "--rot": "-8deg" }}
          >
            <i className="fa-solid fa-file-lines text-xl text-brand-gold" />
          </span>
          <span
            className="float-icon absolute right-[10%] top-[24%] hidden px-1 py-1 md:block"
            style={{ "--rot": "6deg", animationDelay: "-2s" }}
          >
            <i className="fa-solid fa-circle-check text-xl text-brand-gold" />
          </span>
          <span
            className="float-icon absolute left-[16%] bottom-[16%] hidden px-1 py-1 lg:block"
            style={{ "--rot": "10deg", animationDelay: "-4s" }}
          >
            <i className="fa-solid fa-wand-magic-sparkles text-xl text-brand-gold" />
          </span>
          <span
            className="float-icon absolute right-[18%] bottom-[20%] hidden px-1 py-1 lg:block"
            style={{ "--rot": "-6deg", animationDelay: "-1.5s" }}
          >
            <i className="fa-solid fa-download text-xl text-brand-gold" />
          </span>
          <span
            className="float-icon absolute left-[5%] top-[45%] hidden px-1 py-1 xl:block"
            style={{ "--rot": "4deg", animationDelay: "-3s" }}
          >
            <i className="fa-solid fa-scroll text-xl text-brand-gold" />
          </span>
          <span
            className="float-icon absolute right-[6%] top-[52%] hidden px-1 py-1 xl:block"
            style={{ "--rot": "-9deg", animationDelay: "-5s" }}
          >
            <i className="fa-solid fa-book text-xl text-brand-gold" />
          </span>
        </div>

        <div className="container-page relative py-14 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-100 backdrop-blur">
              <BrandLogo size={24} />
              <span className="truncate">
                DuFast EduAi. AI-powered assessment generator
              </span>
            </span>
            <h1 className="font-display mt-5 text-[28px] font-bold leading-tight text-white sm:text-5xl">
              Turn your course notes into{" "}
              <span className="font-hand text-brand-gold">
                exam-ready papers
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-emerald-100/80 sm:text-base">
              Upload a course document and the AI writes a complete quiz, exam,
              exercise or homework with an answer key and explanations. Ready to
              print in seconds.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <button
                onClick={() => navigate("/app")}
                className="btn-primary !bg-brand-gold !text-brand-green-ink hover:!bg-brand-gold/90 sm:w-auto"
              >
                Start generating assessments{" "}
                <i className="fa-solid fa-arrow-right text-sm" />
              </button>
              <Link to="/login" className="btn-white sm:w-auto">
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-xs text-emerald-100/60">
              Works with or without an AI key — an offline generator always
              produces a usable paper.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 bg-white/5">
          <div className="container-page grid grid-cols-2 gap-x-3 gap-y-4 py-6 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4">
            {[
              {
                fa: "fa-graduation-cap",
                label: "Quiz · Exam · Exercise · Homework",
              },
              { fa: "fa-circle-check", label: "Answer key with explanations" },
              { fa: "fa-file-circle-check", label: "Student paper + marking guide" },
              { fa: "fa-shield-halved", label: "Private per-teacher library" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-center gap-2 px-2 text-center"
              >
                <i className={`fa-solid ${s.fa} text-base text-brand-gold`} />
                <span className="text-[11px] font-medium leading-tight text-emerald-100/80 sm:text-[13px]">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container-page py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-hand text-3xl font-bold text-brand-green-deep sm:text-5xl">
            From notes to a full paper in seconds
          </h2>
          <p className="section-subtitle">
            Designed for teachers who need real exam-style questions. Not trivia
            about the document itself.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group card card-hover relative overflow-hidden rounded-2xl p-6 text-center"
            >
              <i className={`fa-solid ${f.fa} text-3xl text-brand-green-dark transition-colors duration-300 group-hover:text-brand-gold`} />
              <h3 className="mt-4 text-[15px] font-bold text-slate-900 transition-colors duration-300 group-hover:text-brand-green-deep">
                {f.title}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-white">
        <div className="container-page py-14 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-hand text-3xl font-bold text-brand-green-deep sm:text-5xl">
              Three simple steps
            </h2>
          </div>
          <div className="relative mt-14 grid gap-8 sm:mt-14 sm:grid-cols-3 sm:gap-6">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="relative rounded-2xl border border-slate-200 bg-brand-green-light/40 p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand-green-soft hover:shadow-lift"
              >
                <span className="font-hand absolute -top-8 left-5 text-6xl font-bold leading-none text-brand-gold drop-shadow-sm">
                  {s.n}
                </span>
                <i className={`fa-solid ${s.fa} mt-4 text-2xl text-brand-green-dark`} />
                <h3 className="mt-3 text-[15px] font-bold text-slate-900">
                  {s.title}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                  {s.text}
                </p>
                <ul className="mt-3 space-y-1.5 border-t border-slate-200 pt-3">
                  {s.details.map((d) => (
                    <li
                      key={d}
                      className="flex items-start gap-1.5 text-[12px] text-slate-600"
                    >
                      <i className="fa-solid fa-circle-check mt-0.5 text-sm text-brand-green-dark" />
                      {d}
                    </li>
                  ))}
                </ul>
                {i < steps.length - 1 && (
                  <i className="fa-solid fa-arrow-right absolute -right-5 top-1/2 hidden -translate-y-1/2 text-xl text-slate-300 sm:block" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-12 text-center sm:mt-14">
            <button onClick={() => navigate("/app")} className="btn-primary">
              <i className="fa-solid fa-file-lines text-sm" /> Try it now
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-green-ink px-4 py-6">
        <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-emerald-100/60">
          DuFast EduAi · upload → generate → download · built as a standalone
          project ·{" "}
          <Link
            to="/developer"
            className="font-semibold text-brand-gold hover:underline"
          >
            Meet the developer
          </Link>
        </p>
      </footer>
    </div>
  );
}
