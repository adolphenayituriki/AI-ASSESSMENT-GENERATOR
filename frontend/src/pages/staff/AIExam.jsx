import { useState, useCallback } from 'react';
import {
  BrainCircuit,
  Upload,
  FileText,
  Sparkles,
  Save,
  Download,
  Trash2,
  Eye,
  X,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Library,
  Wand2,
  FileUp,
  Lightbulb,
  FileCheck2,
  Image,
  BarChart2,
  ListChecks,
  PenLine,
  BookOpen,
  ClipboardList,
  CalendarDays,
  ArrowRight,
  ShieldCheck,
  Timer,
  Minus,
  Plus,
} from 'lucide-react';
import Spinner from '../../components/Spinner';
import Alert from '../../components/Alert';
import BrandLogo from '../../components/BrandLogo';
import api from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { errorMessage, formatDateTime, SUBJECTS } from '../../utils/helpers';

const ASSESSMENT_TYPES = [
  { key: 'quiz', label: 'Quiz' },
  { key: 'exam', label: 'Exam' },
  { key: 'exercise', label: 'Exercise' },
  { key: 'homework', label: 'Homework' },
];

const DIFFICULTIES = [
  { key: 'Auto', label: 'Auto' },
  { key: 'Easy', label: 'Easy' },
  { key: 'Medium', label: 'Medium' },
  { key: 'Advanced', label: 'Advanced' },
];

const TIME_OPTIONS = [
  { key: '', label: 'Default (60 min)' },
  { key: '30', label: '30 minutes' },
  { key: '45', label: '45 minutes' },
  { key: '60', label: '60 minutes' },
  { key: '90', label: '90 minutes' },
  { key: '120', label: '120 minutes' },
  { key: '180', label: '180 minutes' },
];

const TYPE_META = {
  quiz: { icon: ListChecks, chip: 'bg-sky-100 text-sky-700', soft: 'bg-sky-50 text-sky-700' },
  exam: { icon: FileText, chip: 'bg-brand-green-light text-brand-green-dark', soft: 'bg-brand-green-light text-brand-green-dark' },
  exercise: { icon: PenLine, chip: 'bg-amber-100 text-amber-700', soft: 'bg-amber-50 text-amber-700' },
  homework: { icon: BookOpen, chip: 'bg-violet-100 text-violet-700', soft: 'bg-violet-50 text-violet-700' },
};

function QuestionBlock({ q, index }) {
  return (
    <li className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-green-dark to-brand-green text-[12px] font-bold text-white shadow-sm">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-relaxed text-slate-800">
            {q.question}
            {q.marks != null && (
              <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {q.marks} mark{q.marks > 1 ? 's' : ''}
              </span>
            )}
            {q.diagram && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-green-light px-2 py-0.5 text-[10px] font-bold text-brand-green-dark">
                <Image className="h-3 w-3" /> Draw &amp; label
              </span>
            )}
            {q.graph && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                <BarChart2 className="h-3 w-3" /> Graph
              </span>
            )}
          </p>
          {q.options.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {q.options.map((o, i) => {
                const isCorrect = i === q.correctIndex;
                return (
                  <li
                    key={i}
                    className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-[13px] transition ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-800'
                        : 'border-slate-100 bg-slate-50/60 text-slate-600'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isCorrect ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 ring-1 ring-slate-200'
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="min-w-0 flex-1">{o}</span>
                    {isCorrect && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
                  </li>
                );
              })}
            </ul>
          )}
          {q.answer && (
            <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-3.5 py-2.5 text-[13px] text-sky-900">
              <span className="font-semibold">Model answer: </span>
              {q.answer}
            </div>
          )}
          {q.explanation && (
            <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-amber-50/70 px-3.5 py-2.5 text-xs leading-relaxed text-slate-500">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold" />
              <span>
                <span className="font-semibold text-slate-600">Explanation:</span> {q.explanation}
              </span>
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

const SOURCE_META = {
  gemini: { label: 'Gemini AI', cls: 'bg-violet-100 text-violet-700' },
  openai: { label: 'AI', cls: 'bg-indigo-100 text-indigo-700' },
  fallback: { label: 'Offline', cls: 'bg-amber-100 text-amber-700' },
};

function sourceBadge(src) {
  const m = SOURCE_META[src] || SOURCE_META.fallback;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.cls}`}>{m.label}</span>;
}

export default function AIExam() {
  const { data: classesData } = useFetch('/staff/classes');
  const classes = classesData || [];

  const LEVEL_ORDER = ['Nursery', 'Primary', 'Ordinary Level', 'Advanced Level'];
  const groupedClasses = LEVEL_ORDER.map((level) => ({
    level,
    items: classes.filter((c) => c.level === level),
  })).filter((g) => g.items.length > 0);

  const [doc, setDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState(null);
  const [selectedTopics, setSelectedTopics] = useState([]);

  const [form, setForm] = useState({
    type: 'quiz',
    count: 10,
    subject: '',
    className: '',
    title: '',
    difficulty: 'Auto',
    timeAllowed: '60',
    extraInstructions: '',
  });

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [result, setResult] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const {
    data: library,
    loading: libraryLoading,
    reload: reloadLibrary,
  } = useFetch('/assessments');
  const [view, setView] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchTopics = useCallback(async (documentId) => {
    if (!documentId) return;
    setTopicsLoading(true);
    setTopicsError(null);
    try {
      const res = await api.post('/assessments/topics', { documentId });
      setTopics(res.data.topics || []);
    } catch (err) {
      setTopicsError(errorMessage(err, 'Could not find topics'));
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  const toggleTopic = (t) =>
    setSelectedTopics((sel) => (sel.includes(t) ? sel.filter((x) => x !== t) : [...sel, t]));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/assessments/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDoc(res.data.document);
      setResult(null);
      setSelectedTopics([]);
      fetchTopics(res.data.document.id);
    } catch (err) {
      setUploadError(errorMessage(err, 'Upload failed'));
      setDoc(null);
      setTopics([]);
      setSelectedTopics([]);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!doc) return;
    setGenerating(true);
    setGenerateError(null);
    setSaveNotice(null);
    try {
      const res = await api.post('/assessments/generate', {
        documentId: doc.id,
        type: form.type,
        count: form.count,
        subject: form.subject,
        className: form.className,
        title: form.title,
        difficulty: form.difficulty,
        topics: selectedTopics,
      });
      setResult(res.data);
    } catch (err) {
      setGenerateError(errorMessage(err, 'Generation failed'));
    } finally {
      setGenerating(false);
    }
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const safeName = (title) =>
    (title || 'assessment').replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-') || 'assessment';

  const downloadCSV = (item) => {
    const rows = [['No.', 'Question', 'Options', 'Correct Answer', 'Diagram', 'Graph', 'Explanation']];
    (item.questions || []).forEach((q, i) => {
      const options = q.options.length
        ? q.options.map((o, idx) => `${String.fromCharCode(65 + idx)}. ${o}`).join(' | ')
        : '';
      const correct = q.options.length > 0 ? q.options[q.correctIndex] : q.answer;
      rows.push([i + 1, q.question, options, correct, q.diagram ? 'Yes' : 'No', q.graph ? 'Yes' : 'No', q.explanation]);
    });
    const csv =
      '\uFEFF' +
      rows
        .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
    triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${safeName(item.title)}.csv`);
  };

  const downloadPdf = async (item, opts = {}) => {
    try {
      const res = await api.post(
        '/assessments/pdf',
        {
          title: item.title,
          type: item.type || form.type,
          subject: item.subject || '',
          className: item.className || '',
          questions: item.questions || [],
          markingGuide: !!opts.markingGuide,
          timeAllowed: item.timeAllowed || form.timeAllowed || '',
          extraInstructions: item.extraInstructions || form.extraInstructions || '',
        },
        { responseType: 'blob' }
      );
      const suffix = opts.markingGuide ? '-marking-guide' : '';
      triggerDownload(res.data, `${safeName(item.title)}${suffix}.pdf`);
    } catch (err) {
      const data = err.response?.data;
      if (data instanceof Blob && !data.type.includes('pdf')) {
        const text = await data.text().catch(() => '');
        let message = 'Download failed';
        try {
          message = JSON.parse(text).message || message;
        } catch {
          if (text) message = text.slice(0, 200);
        }
        window.alert(message);
        return;
      }
      window.alert(errorMessage(err, 'Could not download PDF'));
    }
  };

  const pdfFromId = async (id) => {
    try {
      const res = await api.get(`/assessments/${id}`);
      await downloadPdf(res.data);
    } catch (err) {
      window.alert(errorMessage(err, 'Could not download PDF'));
    }
  };

  const markingFromId = async (id) => {
    try {
      const res = await api.get(`/assessments/${id}`);
      await downloadPdf(res.data, { markingGuide: true });
    } catch (err) {
      window.alert(errorMessage(err, 'Could not download marking guide'));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveNotice(null);
    try {
      await api.post('/assessments', {
        documentId: doc?.id,
        title: result.title,
        type: form.type,
        subject: form.subject,
        className: form.className,
        source: result.source,
        difficulty: form.difficulty,
        timeAllowed: form.timeAllowed,
        extraInstructions: form.extraInstructions,
        questions: result.questions,
      });
      setSaveNotice('Saved to your assessment library.');
      reloadLibrary();
    } catch (err) {
      setSaveError(errorMessage(err, 'Could not save assessment'));
    } finally {
      setSaving(false);
    }
  };

  const openView = useCallback(async (id) => {
    setViewLoading(true);
    setView(null);
    try {
      const res = await api.get(`/assessments/${id}`);
      setView(res.data);
    } catch (err) {
      setView({ error: errorMessage(err) });
    } finally {
      setViewLoading(false);
    }
  }, []);

  const downloadFromId = async (id) => {
    try {
      const res = await api.get(`/assessments/${id}`);
      downloadCSV(res.data);
    } catch (err) {
      window.alert(errorMessage(err, 'Could not download assessment'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assessment from your library?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/assessments/${id}`);
      if (view?._id === id) setView(null);
      reloadLibrary();
    } catch (err) {
      window.alert(errorMessage(err, 'Could not delete assessment'));
    } finally {
      setDeletingId(null);
    }
  };

  const badge = (item) => {
    const meta = TYPE_META[item.type] || TYPE_META.quiz;
    const Icon = meta.icon;
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${meta.chip}`}>
          <Icon className="h-3 w-3" /> {item.type}
        </span>
        {item.subject && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{item.subject}</span>
        )}
        {item.className && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{item.className}</span>
        )}
        {item.difficulty && item.difficulty !== 'Auto' && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">{item.difficulty}</span>
        )}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.source === 'gemini' ? 'bg-violet-100 text-violet-700' : item.source === 'openai' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
          {item.source === 'gemini' ? 'Gemini AI' : item.source === 'openai' ? 'AI' : 'Offline'}
        </span>
      </div>
    );
  };

  const TypeIcon = TYPE_META[form.type]?.icon || ListChecks;

  return (
    <div className="page-fade space-y-4">
      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-green-ink via-brand-green-deep to-brand-green-dark p-4 shadow-lift sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-green/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-brand-gold/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <BrandLogo size={48} />
          <div>
            <h1 className="font-display text-lg font-bold text-white sm:text-xl">AI Assessments</h1>
            <p className="mt-0.5 text-xs text-emerald-100/80 sm:text-sm">
              Upload a course document. The AI builds a quiz, exam, exercise or homework from its content.
            </p>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* Left column: controls (sticky so settings stay visible while the right side scrolls) */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto lg:scroll-smooth lg:pr-1">
          {/* Step 1 */}
          <div className="card p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-green-dark to-brand-green text-xs font-bold text-white shadow-sm">
                1
              </span>
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <FileUp className="h-4 w-4 text-brand-green-dark" /> Course document
              </h2>
              {doc && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Ready
                </span>
              )}
            </div>

            <label className="group flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-brand-green-soft bg-gradient-to-b from-brand-green-light/60 to-white px-4 py-7 text-center transition hover:border-brand-green-dark hover:from-brand-green-light hover:shadow-md">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-brand-green-dark transition group-hover:scale-105">
                {uploading ? <Spinner size="sm" /> : <Upload className="h-6 w-6" />}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {uploading ? 'Reading document...' : 'Choose a PDF, DOCX or TXT file'}
              </span>
              <span className="text-[10px] text-slate-400">Max 30 MB · text must be extractable</span>
              <input type="file" accept=".pdf,.docx,.txt" className="sr-only" onChange={handleFile} disabled={uploading} />
            </label>

            {uploadError && (
              <div className="mt-2.5"><Alert type="error" message={uploadError} onClose={() => setUploadError(null)} /></div>
            )}

            {doc && (
              <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-brand-green-soft bg-brand-green-light px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-green-dark">
                  <FileText className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">{doc.originalName}</p>
                  <p className="text-[11px] text-slate-500">{doc.wordCount.toLocaleString()} words extracted</p>
                </div>
                <Sparkles className="h-4 w-4 shrink-0 text-brand-gold" />
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div className="card p-4 sm:p-5">
            <div className="mb-3.5 flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-green-dark to-brand-green text-xs font-bold text-white shadow-sm">
                2
              </span>
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <Wand2 className="h-4 w-4 text-brand-green-dark" /> Assessment settings
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label-field">Type</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {ASSESSMENT_TYPES.map((t) => {
                    const Icon = TYPE_META[t.key].icon;
                    const active = form.type === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, type: t.key }))}
                        className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-[11px] font-semibold capitalize transition ${
                          active
                            ? 'border-brand-green-dark bg-gradient-to-br from-brand-green-dark to-brand-green text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-brand-green-soft hover:text-brand-green-dark'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label-field">Number of questions</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, count: Math.max(3, f.count - 1) }))}
                    disabled={form.count <= 3}
                    aria-label="Decrease questions"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-brand-green-dark hover:text-brand-green-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-brand-green-soft bg-brand-green-light/60 px-3 text-sm font-bold text-brand-green-dark">
                    {form.count}
                    <span className="text-[11px] font-semibold text-slate-500">questions</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, count: Math.min(30, f.count + 1) }))}
                    disabled={form.count >= 30}
                    aria-label="Increase questions"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-brand-green-dark hover:text-brand-green-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">From 3 to 30 questions</p>
              </div>

              <div>
                <label className="label-field">Subject</label>
                <div className="relative">
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    className="input-field appearance-none pr-10"
                  >
                    <option value="">General / auto-detect</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label-field">Class (optional)</label>
                <div className="relative">
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={form.className}
                    onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
                    className="input-field appearance-none pr-10"
                  >
                    <option value="">Any / all classes</option>
                    {groupedClasses.map((g) => (
                      <optgroup key={g.level} label={g.level}>
                        {g.items.map((c) => (
                          <option key={c._id} value={c.name}>{c.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label-field flex items-center justify-between gap-2">
                  <span>Topics (optional)</span>
                  {doc && !topicsLoading && topics.length > 0 && (
                    <button
                      type="button"
                      onClick={() => fetchTopics(doc.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-green-dark hover:underline"
                    >
                      <RefreshCw className="h-3 w-3" /> Refresh
                    </button>
                  )}
                </label>
                {!doc ? (
                  <p className="text-[11px] text-slate-400">Upload a document first to see its topics.</p>
                ) : topicsLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    <Spinner size="sm" /> Finding topics in the document...
                  </div>
                ) : topicsError ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
                    <span className="text-[11px] text-rose-600">{topicsError}</span>
                    <button type="button" onClick={() => fetchTopics(doc.id)} className="text-[11px] font-semibold text-rose-600 underline">
                      Retry
                    </button>
                  </div>
                ) : topics.length === 0 ? (
                  <p className="text-[11px] text-slate-400">No clear topics found — the whole document will be used.</p>
                ) : (
                  <div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedTopics([])}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                          selectedTopics.length === 0
                            ? 'border-brand-green-dark bg-brand-green-dark text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-brand-green-soft hover:text-brand-green-dark'
                        }`}
                      >
                        <BookOpen className="h-3 w-3" /> Whole document
                      </button>
                      {topics.map((t) => {
                        const active = selectedTopics.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleTopic(t)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                              active
                                ? 'border-brand-green-dark bg-brand-green-dark text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-brand-green-soft hover:text-brand-green-dark'
                            }`}
                          >
                            {active && <CheckCircle2 className="h-3 w-3" />}
                            {t}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-400">
                      {selectedTopics.length === 0
                        ? 'All topics/chapters found in the document — select one or more to focus the questions, or keep "Whole document".'
                        : `${selectedTopics.length} topic${selectedTopics.length > 1 ? 's' : ''} selected — questions will focus only on them.`}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="label-field">Difficulty</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {DIFFICULTIES.map((d) => {
                    const active = form.difficulty === d.key;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, difficulty: d.key }))}
                        className={`rounded-lg border px-1.5 py-1.5 text-[11px] font-semibold transition ${
                          active
                            ? 'border-brand-green-dark bg-brand-green-dark text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-brand-green-soft hover:text-brand-green-dark'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label-field">Time allowed</label>
                <div className="relative">
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={form.timeAllowed}
                    onChange={(e) => setForm((f) => ({ ...f, timeAllowed: e.target.value }))}
                    className="input-field appearance-none pr-9 text-[12px]"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.key || 'default'} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="flex items-start gap-2 rounded-lg bg-brand-green-light/60 px-3 py-2.5 text-[11px] leading-snug text-brand-green-dark">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Marks: the AI automatically gives each question its own marks based on the question's difficulty and length.
                </span>
              </p>

              <div>
                <label className="label-field">Extra instructions (optional)</label>
                <input
                  type="text"
                  value={form.extraInstructions}
                  onChange={(e) => setForm((f) => ({ ...f, extraInstructions: e.target.value }))}
                  placeholder="e.g. Answer in blue or black ink"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-field">Title (optional)</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. S2 Mathematics Quiz — Unit 3"
                  className="input-field"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={!doc || generating}
                className="btn-primary w-full justify-center !bg-gradient-to-r !from-brand-green-dark !to-brand-green shadow-md disabled:opacity-60 disabled:shadow-none"
              >
                {generating ? <Spinner size="sm" light /> : <Sparkles className="h-4 w-4" />}
                {generating ? 'Generating...' : 'Generate assessment'}
                {!generating && <ArrowRight className="h-4 w-4" />}
              </button>
              {generateError && (
                <div className="mt-2">
                  <Alert type="error" message={generateError} onClose={() => setGenerateError(null)} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: result + library */}
        <div className="space-y-5">
          {result ? (
            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-brand-green-light/80 to-white px-4 py-3.5 sm:px-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-brand-green-dark">
                      <TypeIcon className="h-4 w-4" />
                    </span>
                    <h2 className="truncate text-sm font-bold text-slate-900">{result.title}</h2>
                  </div>
                  <div className="mt-1.5 ml-11">{badge({ type: form.type, subject: form.subject, className: form.className, source: result.source })}</div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    onClick={() => downloadPdf({ title: result.title, type: form.type, subject: form.subject, className: form.className, questions: result.questions })}
                    className="btn-primary !px-3.5 !py-2 !bg-gradient-to-r !from-brand-green-dark !to-brand-green shadow-md"
                  >
                    <Download className="h-4 w-4" /> PDF
                  </button>
                  <button
                    onClick={() => downloadPdf({ title: result.title, type: form.type, subject: form.subject, className: form.className, questions: result.questions }, { markingGuide: true })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark"
                  >
                    <FileCheck2 className="h-4 w-4" /> Marking guide
                  </button>
                  <button
                    onClick={() => downloadCSV(result)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark"
                  >
                    <Download className="h-4 w-4" /> CSV
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark disabled:opacity-60"
                  >
                    {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Saving...' : 'Save to library'}
                  </button>
                </div>
              </div>
              <ol className="space-y-3 px-4 py-4 sm:px-5">
                {result.questions.map((q, i) => (
                  <QuestionBlock key={i} q={q} index={i} />
                ))}
              </ol>
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-500 sm:px-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">
                  {result.questions.length} questions
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">
                  {result.questions.reduce((s, q) => s + (Number(q.marks) || 1), 0)} marks
                </span>
                <span>
                  generated
                  {result.source === 'gemini' ? ' with Gemini AI' : result.source === 'openai' ? ' with AI' : ' offline from the document'}.
                </span>
                <button onClick={() => { setResult(null); setGenerateError(null); }} className="ml-auto inline-flex items-center gap-1 font-semibold text-brand-green-dark hover:underline">
                  <RefreshCw className="h-3.5 w-3.5" /> Generate again
                </button>
              </div>
              {saveNotice && <div className="px-4 pb-3 sm:px-5"><Alert type="success" message={saveNotice} onClose={() => setSaveNotice(null)} /></div>}
              {saveError && <div className="px-4 pb-3 sm:px-5"><Alert type="error" message={saveError} onClose={() => setSaveError(null)} /></div>}
            </div>
          ) : (
            <div className="card relative overflow-hidden px-6 py-16 text-center">
              <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-brand-green-light blur-2xl" />
              <div className="pointer-events-none absolute -left-14 -bottom-16 h-48 w-48 rounded-full bg-brand-gold/10 blur-2xl" />
              <div className="relative">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-brand-green-dark">
                  <BrainCircuit className="h-8 w-8" />
                </span>
                <h2 className="mt-4 text-sm font-bold text-slate-800">Your AI assessment will appear here</h2>
                <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400">
                  Upload a course document, pick the type and number of questions, then press Generate. Every question
                  comes with an answer key and explanation, and can be saved or downloaded as CSV.
                </p>
                <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-brand-green-dark">
                  <ClipboardList className="h-3.5 w-3.5" /> Start with step 1 on the left
                </div>
              </div>
            </div>
          )}

          {/* Library */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 py-3.5 sm:px-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-green-dark">
                  <Library className="h-4 w-4" />
                </span>
                My Assessment Library
                {library && library.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {library.length}
                  </span>
                )}
              </h2>
              <button onClick={reloadLibrary} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-green-dark hover:underline">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>

            {viewLoading && (
              <div className="flex justify-center py-10"><Spinner /></div>
            )}

            {view && !viewLoading && (
              <div className="border-b border-slate-100 bg-brand-green-light/40 px-4 py-4 sm:px-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-bold text-slate-900">{view.title}</h3>
                  <button onClick={() => setView(null)} className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {view.error ? (
                  <p className="text-sm text-rose-600">{view.error}</p>
                ) : (
                  <>
                    <div className="mb-3">{badge(view)}</div>
                    <ol className="space-y-2.5">
                      {(view.questions || []).map((q, i) => (
                        <QuestionBlock key={i} q={q} index={i} />
                      ))}
                    </ol>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => downloadPdf(view)}
                        className="btn-primary !px-3.5 !py-2 !bg-gradient-to-r !from-brand-green-dark !to-brand-green shadow-md"
                      >
                        <Download className="h-4 w-4" /> Download PDF
                      </button>
                      <button
                        onClick={() => downloadPdf(view, { markingGuide: true })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark"
                      >
                        <FileCheck2 className="h-4 w-4" /> Marking guide
                      </button>
                      <button
                        onClick={() => downloadCSV(view)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark"
                      >
                        <Download className="h-4 w-4" /> Download CSV
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {libraryLoading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : !library || library.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">
                No saved assessments yet. Generate one and press Save to keep it here.
              </p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {library.map((item) => {
                  const meta = TYPE_META[item.type] || TYPE_META.quiz;
                  const Icon = meta.icon;
                  return (
                    <li key={item._id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition hover:bg-brand-green-light/50 sm:px-5">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.soft}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {badge(item)}
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <CalendarDays className="h-3 w-3" /> {formatDateTime(item.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => openView(item._id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        <button
                          onClick={() => pdfFromId(item._id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark"
                        >
                          <Download className="h-3.5 w-3.5" /> PDF
                        </button>
                        <button
                          onClick={() => markingFromId(item._id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark"
                        >
                          <FileCheck2 className="h-3.5 w-3.5" /> Guide
                        </button>
                        <button
                          onClick={() => downloadFromId(item._id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark"
                        >
                          <Download className="h-3.5 w-3.5" /> CSV
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          disabled={deletingId === item._id}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-500 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                        >
                          {deletingId === item._id ? <Spinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl border border-brand-green-soft bg-brand-green-light/70 px-4 py-3 text-xs text-slate-600">
            <AlertCircle className="h-4 w-4 shrink-0 text-brand-green-dark" />
            {!result ? (
              <>Assessments are written by Gemini AI when a key is set in backend/.env, and fall back to offline generation otherwise.</>
            ) : result.source === 'fallback' ? (
              <>No AI key available — this assessment was generated offline from the document text.</>
            ) : (
              <>This assessment was written by AI from your document. You can save it to your library or download it as a PDF for your students.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
