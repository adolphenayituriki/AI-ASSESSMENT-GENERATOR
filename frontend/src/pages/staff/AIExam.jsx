import { useState, useCallback, useMemo } from 'react';
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
  ChevronRight,
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
  Timer,
  Minus,
  Plus,
  Check,
  Search,
  SlidersHorizontal,
  Clock,
  Scale,
  Pencil,
  Inbox,
  ShieldCheck,
} from 'lucide-react';
import Spinner from '../../components/Spinner';
import Alert from '../../components/Alert';
import BrandLogo from '../../components/BrandLogo';
import api from '../../api';
import { useFetch } from '../../hooks/useFetch';
import { errorMessage, formatDateTime, SUBJECTS } from '../../utils/helpers';

const ASSESSMENT_TYPES = [
  { key: 'quiz', label: 'Quiz', desc: 'Quick knowledge check' },
  { key: 'exam', label: 'Exam', desc: 'Formal assessment' },
  { key: 'exercise', label: 'Exercise', desc: 'Practice questions' },
  { key: 'homework', label: 'Homework', desc: 'Take-home assignment' },
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
  quiz: { icon: ListChecks, chip: 'bg-sky-100 text-sky-700', soft: 'bg-sky-50 text-sky-700', desc: 'Quick knowledge check' },
  exam: { icon: FileText, chip: 'bg-brand-green-light text-brand-green-dark', soft: 'bg-brand-green-light text-brand-green-dark', desc: 'Formal assessment' },
  exercise: { icon: PenLine, chip: 'bg-amber-100 text-amber-700', soft: 'bg-amber-50 text-amber-700', desc: 'Practice questions' },
  homework: { icon: BookOpen, chip: 'bg-violet-100 text-violet-700', soft: 'bg-violet-50 text-violet-700', desc: 'Take-home assignment' },
};

const SOURCE_META = {
  gemini: { label: 'Gemini AI', cls: 'bg-violet-100 text-violet-700' },
  openai: { label: 'AI', cls: 'bg-indigo-100 text-indigo-700' },
  fallback: { label: 'Offline', cls: 'bg-amber-100 text-amber-700' },
};

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Accept both shapes the API may return — flat strings or { name, subtopics }
// objects — and always produce { name, subtopics } for the topic tree.
function normalizeTopicItem(t) {
  if (t && typeof t === 'object' && t.name) {
    return { name: String(t.name), subtopics: Array.isArray(t.subtopics) ? t.subtopics.map((s) => String(s)) : [] };
  }
  return { name: String(t || '').trim(), subtopics: [] };
}

function QuestionCard({ q, index, defaultOpen = false, editing = false, draft, onDraftChange }) {
  const [open, setOpen] = useState(defaultOpen);
  const isMcq = (q.options || []).length > 0;
  const isVisual = q.diagram || q.graph;
  const qtype = isMcq
    ? 'Multiple choice'
    : q.diagram
      ? 'Diagram question'
      : q.graph
        ? 'Graph question'
        : 'Short answer';
  const qtypeCls = isMcq
    ? 'bg-sky-50 text-sky-700 ring-sky-100'
    : isVisual
      ? 'bg-violet-50 text-violet-700 ring-violet-100'
      : 'bg-slate-100 text-slate-600 ring-slate-200';

  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow duration-200 hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Question ${index + 1}: ${q.question}`}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50/70 sm:px-5"
      >
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-green-light text-xs font-bold text-brand-green-deep ring-1 ring-inset ring-brand-green-soft">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-relaxed text-slate-800">{q.question}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${qtypeCls}`}>
              {isMcq ? <ListChecks className="h-3 w-3" /> : isVisual ? <Image className="h-3 w-3" /> : <PenLine className="h-3 w-3" />}
              {qtype}
            </span>
            {q.marks != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                <Scale className="h-3 w-3" /> {q.marks} mark{q.marks > 1 ? 's' : ''}
              </span>
            )}
          </span>
        </span>
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform duration-200 ${
            open ? 'rotate-180 text-brand-green-dark' : 'text-slate-400'
          }`}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-4 sm:px-5">
          {editing ? (
            <div>
              <label className="label-field !mb-1.5 text-xs font-semibold text-slate-500">Question text</label>
              <textarea
                rows={2}
                value={draft.questions[index].question}
                onChange={(e) => onDraftChange(index, e.target.value)}
                className="input-field resize-y text-[13px]"
                aria-label={`Edit question ${index + 1}`}
              />
            </div>
          ) : isMcq ? (
            <ul className="space-y-1.5">
              {q.options.map((o, i) => {
                const correct = i === q.correctIndex;
                return (
                  <li
                    key={i}
                    className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-[13px] transition ${
                      correct
                        ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-800'
                        : 'border-slate-100 bg-white text-slate-600'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        correct ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="min-w-0 flex-1">{o}</span>
                    {correct && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-lg border border-sky-100 bg-sky-50 px-3.5 py-2.5 text-[13px] text-sky-900">
              <span className="font-semibold">Model answer: </span>
              {q.answer}
            </div>
          )}

          {isVisual && !editing && (
            <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-3.5 py-2 text-[12px] text-violet-700">
              {q.diagram ? <Image className="h-3.5 w-3.5 shrink-0" /> : <BarChart2 className="h-3.5 w-3.5 shrink-0" />}
              <span>
                {q.diagram
                  ? 'Students draw and label the answer in the empty box on the paper.'
                  : `Students plot the answer on labelled axes${q.graphX && q.graphY ? ` (${q.graphX} vs ${q.graphY})` : ''}.`}
              </span>
            </div>
          )}

          {q.explanation && !editing && (
            <p className="mt-2.5 flex items-start gap-2 rounded-lg bg-amber-50/80 px-3.5 py-2.5 text-xs leading-relaxed text-slate-500">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-gold" />
              <span>
                <span className="font-semibold text-slate-600">Explanation:</span> {q.explanation}
              </span>
            </p>
          )}
        </div>
      )}
    </li>
  );
}

const STEP_STATES = {
  done: { circle: 'bg-emerald-500 text-white ring-4 ring-emerald-100', line: 'bg-emerald-300' },
  active: { circle: 'step-active-pulse bg-gradient-to-br from-brand-green-dark to-brand-green text-white shadow-md ring-4 ring-brand-green-soft', line: 'bg-brand-green-soft' },
  todo: { circle: 'border border-slate-300 bg-white text-slate-400', line: 'bg-slate-200' },
};

function StepHeader({ number, state, title, icon: Icon, trailing }) {
  const s = STEP_STATES[state] || STEP_STATES.todo;
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition ${s.circle}`}>
        {state === 'done' ? <Check className="h-4 w-4" /> : number}
      </span>
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
        <Icon className="h-4 w-4 text-brand-green-dark" /> {title}
      </h2>
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
}

function StepConnector({ state }) {
  const s = STEP_STATES[state] || STEP_STATES.todo;
  return (
    <div className="ml-[15px] flex h-3 items-center" aria-hidden="true">
      <div className={`h-full w-0.5 rounded-full ${s.line} transition-colors duration-300`} />
    </div>
  );
}

export default function AIExam() {
  const { data: classesData } = useFetch('/staff/classes');
  const classes = classesData || [];

  const LEVEL_ORDER = ['Nursery', 'Primary', 'Secondary', 'University'];
  const [selectedLevel, setSelectedLevel] = useState('');
  const levelOptions = LEVEL_ORDER.map((level) => ({
    level,
    items: classes.filter((c) => c.level === level),
  })).filter((g) => g.items.length > 0);
  const filteredClasses = selectedLevel
    ? levelOptions.find((g) => g.level === selectedLevel)?.items || []
    : classes;

  const [doc, setDoc] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState([]);
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
  const [generatedAt, setGeneratedAt] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);

  const {
    data: library,
    loading: libraryLoading,
    reload: reloadLibrary,
  } = useFetch('/assessments');
  const [view, setView] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [libQ, setLibQ] = useState('');
  const [libType, setLibType] = useState('all');
  const [libSubject, setLibSubject] = useState('all');
  const [libSort, setLibSort] = useState('newest');

  const fetchTopics = useCallback(async (documentId) => {
    if (!documentId) return;
    setTopicsLoading(true);
    setTopicsError(null);
    try {
      const res = await api.post('/assessments/topics', { documentId });
      setTopics((res.data.topics || []).map(normalizeTopicItem));
    } catch (err) {
      setTopicsError(errorMessage(err, 'Could not find topics'));
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  const toggleTopic = (topic) => {
    setSelectedTopics((sel) => {
      if (sel.some((s) => s.name === topic.name)) return sel.filter((s) => s.name !== topic.name);
      return [...sel, { name: topic.name, limit: 0, subtopics: [] }];
    });
  };

  const toggleSubtopic = (topicName, sub) => {
    setSelectedTopics((sel) => {
      const existing = sel.find((s) => s.name === topicName);
      if (!existing) return [...sel, { name: topicName, limit: 0, subtopics: [sub] }];
      const subtopics = existing.subtopics.includes(sub)
        ? existing.subtopics.filter((x) => x !== sub)
        : [...existing.subtopics, sub];
      if (subtopics.length === 0) return sel.filter((s) => s.name !== topicName);
      return sel.map((s) => (s.name === topicName ? { ...s, subtopics } : s));
    });
  };

  const toggleExpand = (name) => {
    setExpandedTopics((exp) => (exp.includes(name) ? exp.filter((x) => x !== name) : [...exp, name]));
  };

  const setTopicLimit = (name, raw) => {
    const v = parseInt(raw, 10);
    const limit = Number.isNaN(v) || v < 0 ? 0 : Math.min(form.count, v);
    setSelectedTopics((sel) => {
      const existing = sel.find((s) => s.name === name);
      if (!existing) return [...sel, { name, limit, subtopics: [] }];
      return sel.map((s) => (s.name === name ? { ...s, limit } : s));
    });
  };

  const clearDoc = () => {
    setDoc(null);
    setSelectedFile(null);
    setTopics([]);
    setSelectedTopics([]);
    setExpandedTopics([]);
    setResult(null);
    setGenerateError(null);
    setEditing(false);
    setDraft(null);
    setGeneratedAt(null);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    setSelectedFile({ name: file.name, size: file.size });
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/assessments/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDoc(res.data.document);
      setResult(null);
      setSelectedTopics([]);
      setExpandedTopics([]);
      fetchTopics(res.data.document.id);
    } catch (err) {
      setUploadError(errorMessage(err, 'Upload failed'));
      setDoc(null);
      setSelectedFile(null);
      setTopics([]);
      setSelectedTopics([]);
      setExpandedTopics([]);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    const files = e.dataTransfer?.files;
    if (files?.length) handleFile({ target: { files } });
  };

  const handleGenerate = async () => {
    if (!doc) return;
    setGenerating(true);
    setGenerateError(null);
    setSaveNotice(null);
    setSaveError(null);
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
      setGeneratedAt(new Date().toISOString());
      setEditing(false);
      setDraft(null);
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

  const downloadPreviewPdf = () => {
    if (!result) return;
    downloadPdf({
      title: result.title,
      type: form.type,
      subject: form.subject,
      className: form.className,
      questions: result.questions,
      timeAllowed: form.timeAllowed,
      extraInstructions: form.extraInstructions,
    });
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

  const cloneResult = (r) => ({
    title: r.title,
    source: r.source,
    questions: r.questions.map((q) => ({ ...q, options: [...(q.options || [])] })),
  });

  const startEditing = () => {
    setDraft(cloneResult(result));
    setEditing(true);
  };

  const applyEdit = () => {
    setResult(draft);
    setEditing(false);
    setDraft(null);
    setSaveNotice(null);
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
  };

  const onDraftChange = (index, value) => {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q, i) => (i === index ? { ...q, question: value } : q)),
    }));
  };

  const discardResult = () => {
    if (!window.confirm('Discard this generated assessment? It has not been saved yet.')) return;
    setResult(null);
    setGenerateError(null);
    setEditing(false);
    setDraft(null);
    setGeneratedAt(null);
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

  const filteredLibrary = useMemo(() => {
    let items = library || [];
    if (libQ.trim()) {
      const q = libQ.trim().toLowerCase();
      items = items.filter(
        (i) => `${i.title || ''} ${i.subject || ''} ${i.className || ''}`.toLowerCase().includes(q)
      );
    }
    if (libType !== 'all') items = items.filter((i) => i.type === libType);
    if (libSubject !== 'all') items = items.filter((i) => i.subject === libSubject);
    const sorted = [...items];
    sorted.sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return libSort === 'oldest' ? da - db : db - da;
    });
    return sorted;
  }, [library, libQ, libType, libSubject, libSort]);

  const selectCls =
    'w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-slate-400 focus:border-brand-green-dark focus:ring-2 focus:ring-brand-green-soft focus:outline-none';

  return (
    <div className="page-fade space-y-6">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-brand-green-ink via-brand-green-deep to-brand-green-dark px-4 py-3 shadow-lift sm:px-6 sm:py-3.5">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <img
            src="/images/hero-classroom.jpg"
            alt=""
            className="ken-burns h-full w-full object-cover"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-green-ink/90 via-brand-green-deep/85 to-brand-green-dark/90" aria-hidden="true" />
        <div className="bg-grid-faint pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="bg-drift pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-brand-green/25 blur-3xl" aria-hidden="true" />
        <div className="bg-drift pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-brand-gold/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:block" aria-hidden="true">
          <img
            src="/images/float-exam.jpg"
            alt=""
            className="float-icon absolute -right-3 -top-3 h-14 w-14 rounded-full object-cover opacity-45 shadow-lg ring-2 ring-white/20"
            style={{ '--rot': '-8deg', animationDelay: '0.6s' }}
          />
          <img
            src="/images/float-study.jpg"
            alt=""
            className="float-icon absolute -bottom-4 -left-4 h-16 w-16 rounded-full object-cover opacity-40 shadow-lg ring-2 ring-white/20"
            style={{ '--rot': '8deg', animationDelay: '1.8s' }}
          />
          <img
            src="/images/float-notes.jpg"
            alt=""
            className="float-icon absolute -bottom-5 left-1/2 h-12 w-12 rounded-full object-cover opacity-35 shadow-md ring-2 ring-white/15"
            style={{ '--rot': '5deg', animationDelay: '3s' }}
          />
        </div>
        <BrainCircuit className="pointer-events-none absolute -bottom-10 -right-6 hidden h-44 w-44 rotate-12 text-white/[0.06] lg:block" aria-hidden="true" />
        <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <BrandLogo size={40} className="ring-2 ring-white/20" />
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold leading-tight text-white sm:text-xl">
              AI Assessments
              <span className="ml-2 align-middle font-sans text-[9px] font-semibold uppercase tracking-widest text-brand-gold">
                AI Study Tools
              </span>
            </h1>
            <p className="mt-0.5 text-[11px] leading-snug text-emerald-100/75 sm:text-xs">
              Upload course material <span className="font-semibold text-brand-gold">→</span> configure{' '}
              <span className="font-semibold text-brand-gold">→</span> generate{' '}
              <span className="font-semibold text-brand-gold">→</span> review{' '}
              <span className="font-semibold text-brand-gold">→</span> save / download
            </p>
          </div>
          <div className="ml-auto hidden items-center gap-3 text-[10px] font-medium text-emerald-100/70 lg:flex">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-brand-gold" /> Exam-style questions
            </span>
            <span className="h-3 w-px bg-white/20" aria-hidden="true" />
            <span className="inline-flex items-center gap-1">
              <FileCheck2 className="h-3 w-3 text-brand-gold" /> Answer key + explanations
            </span>
          </div>
        </div>
      </section>

      {/* ── Two-column workspace ─────────────────────────────── */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-5">
        {/* Left: configuration steps */}
        <div className="space-y-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6.5rem)] lg:scrollbar-light lg:overflow-y-auto lg:pr-2">
          {/* Step 1 — Course document */}
          <section className="card p-3.5 sm:p-4" aria-label="Step 1 — Course document">
            <StepHeader
              number={1}
              state={doc ? 'done' : 'active'}
              title="Course document"
              icon={FileUp}
              trailing={
                doc && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> Ready
                  </span>
                )
              }
            />

            <div className="mt-3">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!uploading) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`group relative flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all duration-200 ${
                  dragging
                    ? 'border-brand-green-dark bg-brand-green-light shadow-inner'
                    : 'border-brand-green-soft bg-gradient-to-b from-brand-green-light/60 to-white hover:border-brand-green-dark hover:from-brand-green-light'
                }`}
              >
                <input type="file" accept=".pdf,.docx,.txt" className="sr-only" onChange={handleFile} disabled={uploading} />
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-green-dark shadow-sm ring-1 ring-brand-green-soft transition duration-200 group-hover:scale-105 ${
                    dragging ? 'scale-110 ring-2' : ''
                  }`}
                >
                  {uploading ? <Spinner size="sm" /> : <Upload className="h-[18px] w-[18px]" />}
                </span>
                <span className="leading-tight">
                  <span className="block text-[13px] font-semibold text-slate-700">
                    Drag &amp; drop your course document here
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-500">
                    or <span className="font-semibold text-brand-green-dark underline underline-offset-2">click to browse</span>
                  </span>
                </span>
                <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] font-medium text-slate-400">
                  <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> PDF</span>
                  <span aria-hidden="true">·</span>
                  <span>DOCX</span>
                  <span aria-hidden="true">·</span>
                  <span>TXT</span>
                  <span aria-hidden="true">·</span>
                  <span>max 30 MB</span>
                </span>
              </label>

              {uploading && (
                <div className="mt-3">
                  <div className="progress-indeterminate" role="progressbar" aria-label="Uploading document">
                    <span />
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium text-slate-500">Reading document and extracting text…</p>
                </div>
              )}

              {uploadError && (
                <div className="mt-3"><Alert type="error" message={uploadError} onClose={() => setUploadError(null)} /></div>
              )}

              {doc && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-green-dark shadow-sm ring-1 ring-emerald-100">
                    <FileText className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{selectedFile?.name || doc.originalName}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {selectedFile?.size ? `${formatBytes(selectedFile.size)} · ` : ''}
                      {doc.wordCount.toLocaleString()} words extracted
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={clearDoc}
                    disabled={uploading}
                    aria-label="Remove uploaded document"
                    title="Remove document"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </section>

          <StepConnector state={doc ? 'done' : 'todo'} />

          {/* Step 2 — Assessment settings */}
          <section className="card p-3.5 sm:p-4" aria-label="Step 2 — Assessment settings">
            <StepHeader number={2} state={doc ? 'active' : 'todo'} title="Assessment settings" icon={Wand2} />

            <div className="mt-3 space-y-3.5">
              {/* Type */}
              <div>
                <label className="label-field" id="type-label">Type</label>
                <div role="group" aria-labelledby="type-label" className="grid grid-cols-4 gap-1.5">
                  {ASSESSMENT_TYPES.map((t) => {
                    const Icon = TYPE_META[t.key].icon;
                    const active = form.type === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, type: t.key }))}
                        aria-pressed={active}
                        title={TYPE_META[t.key].desc}
                        className={`flex items-center justify-center gap-1 rounded-lg border px-1 py-1.5 transition-all duration-200 ${
                          active
                            ? 'border-brand-green-dark bg-gradient-to-br from-brand-green-dark to-brand-green text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-brand-green-soft hover:shadow-sm'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-white' : 'text-brand-green-dark'}`} />
                        <span className="truncate text-[10px] font-bold leading-none">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Number of questions */}
              <div>
                <label className="label-field" htmlFor="qty-count">Number of questions</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, count: Math.max(3, f.count - 1) }))}
                    disabled={form.count <= 3}
                    aria-label="Decrease questions"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-brand-green-dark hover:text-brand-green-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3" aria-live="polite">
                    <span className="text-base font-bold text-slate-800" id="qty-count">{form.count}</span>
                    <span className="text-xs font-medium text-slate-500">questions</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, count: Math.min(30, f.count + 1) }))}
                    disabled={form.count >= 30}
                    aria-label="Increase questions"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-brand-green-dark hover:text-brand-green-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">Choose between 3 and 30 questions</p>
              </div>

              {/* Subject */}
              <div>
                <label className="label-field" htmlFor="subject">Subject</label>
                <div className="relative">
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <select
                    id="subject"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    className="input-field appearance-none pr-10"
                  >
                    <option value="">Select subject (auto-detect)</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Level */}
              <div>
                <label className="label-field" htmlFor="level">Level</label>
                <div className="relative">
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <select
                    id="level"
                    value={selectedLevel}
                    onChange={(e) => {
                      const level = e.target.value;
                      setSelectedLevel(level);
                      const inLevel = level
                        ? levelOptions.find((g) => g.level === level)?.items.some((c) => c.name === form.className)
                        : classes.some((c) => c.name === form.className);
                      if (!inLevel) setForm((f) => ({ ...f, className: '' }));
                    }}
                    className="input-field appearance-none pr-10"
                  >
                    <option value="">All levels</option>
                    {levelOptions.map((g) => (
                      <option key={g.level} value={g.level}>{g.level}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Class */}
              <div>
                <label className="label-field" htmlFor="class-name">Class (optional)</label>
                <input
                  id="class-name"
                  list="class-suggestions"
                  value={form.className}
                  onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
                  placeholder="e.g. S2, P5, Year 3 — or type your own"
                  className="input-field"
                />
                <datalist id="class-suggestions">
                  {filteredClasses.map((c) => (
                    <option key={c._id} value={c.name} />
                  ))}
                </datalist>
                <p className="mt-1 text-[10px] text-slate-400">
                  {selectedLevel
                    ? `${filteredClasses.length} class${filteredClasses.length === 1 ? '' : 'es'} in ${selectedLevel} — pick one or type a short name`
                    : 'Pick a level to see its classes, or type any class name'}
                </p>
              </div>

              {/* Topics */}
              <div>
                <label className="label-field flex items-center justify-between gap-2">
                  <span id="topics-label">Topics (optional)</span>
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
                    </div>
                    <ul className="mt-2 space-y-1.5" aria-labelledby="topics-label">
                      {topics.map((topic) => {
                        const selected = selectedTopics.find((s) => s.name === topic.name);
                        const expanded = expandedTopics.includes(topic.name);
                        const subs = topic.subtopics || [];
                        return (
                          <li
                            key={topic.name}
                            className={`rounded-xl border transition ${
                              selected
                                ? 'border-brand-green-soft bg-brand-green-light/40'
                                : 'border-slate-100 bg-slate-50/60'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2 px-2.5 py-2">
                              <button
                                type="button"
                                onClick={() => toggleTopic(topic)}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                                  selected
                                    ? 'border-brand-green-dark bg-brand-green-dark text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand-green-soft hover:text-brand-green-dark'
                                }`}
                              >
                                {selected && <CheckCircle2 className="h-3 w-3" />}
                                <span className="max-w-[180px] truncate">{topic.name}</span>
                              </button>
                              {subs.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(topic.name)}
                                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 transition hover:text-brand-green-dark"
                                >
                                  {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  {subs.length} subtopic{subs.length > 1 ? 's' : ''}
                                </button>
                              )}
                              {selected && (
                                <div className="ml-auto flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min={0}
                                    max={form.count}
                                    value={selected.limit > 0 ? selected.limit : ''}
                                    onChange={(e) => setTopicLimit(topic.name, e.target.value)}
                                    placeholder="all"
                                    title="Max questions for this topic (blank = the whole topic)"
                                    className="w-14 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-center text-[11px] font-semibold text-slate-700 focus:border-brand-green-dark focus:outline-none"
                                  />
                                  <span className="text-[10px] text-slate-400">max qns</span>
                                </div>
                              )}
                            </div>
                            {expanded && subs.length > 0 && (
                              <div className="flex flex-wrap gap-1 border-t border-slate-100 bg-white px-2.5 py-2">
                                {subs.map((sub) => {
                                  const subActive = (selected?.subtopics || []).includes(sub);
                                  return (
                                    <button
                                      key={sub}
                                      type="button"
                                      onClick={() => toggleSubtopic(topic.name, sub)}
                                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition ${
                                        subActive
                                          ? 'border-brand-green-dark bg-brand-green-soft text-brand-green-dark'
                                          : 'border-slate-200 bg-white text-slate-400 hover:border-brand-green-soft hover:text-brand-green-dark'
                                      }`}
                                    >
                                      {subActive && <CheckCircle2 className="h-2.5 w-2.5" />}
                                      <span className="max-w-[150px] truncate">{sub}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-1.5 text-[10px] text-slate-400">
                      {selectedTopics.length === 0
                        ? 'Select one or more topics to focus the questions, or keep "Whole document". Click a topic to open its subtopics.'
                        : `${selectedTopics.length} topic${selectedTopics.length > 1 ? 's' : ''} selected — open a topic to choose its subtopics, or set a max number of questions per topic (blank = the whole topic).`}
                    </p>
                  </div>
                )}
              </div>

              {/* Advanced options */}
              <details className="group rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 transition [&::-webkit-details-marker]:hidden [&::marker]:hidden">
                  <span className="flex items-center gap-2 text-[13px] font-bold text-slate-700">
                    <SlidersHorizontal className="h-4 w-4 text-brand-green-dark" /> Advanced options
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="space-y-3.5 border-t border-slate-100 px-3.5 py-3.5">
                  <div>
                    <label className="label-field">Difficulty</label>
                    <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Difficulty">
                      {DIFFICULTIES.map((d) => {
                        const active = form.difficulty === d.key;
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, difficulty: d.key }))}
                            aria-pressed={active}
                            className={`rounded-lg border px-1.5 py-2 text-[11px] font-semibold transition ${
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
                    <label className="label-field" htmlFor="time-allowed">Time allowed</label>
                    <div className="relative">
                      <Timer className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                      <select
                        id="time-allowed"
                        value={form.timeAllowed}
                        onChange={(e) => setForm((f) => ({ ...f, timeAllowed: e.target.value }))}
                        className="input-field appearance-none pl-10 pr-9 text-[12px]"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t.key || 'default'} value={t.key}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label-field" htmlFor="extra-instructions">Extra instructions (optional)</label>
                    <input
                      id="extra-instructions"
                      type="text"
                      value={form.extraInstructions}
                      onChange={(e) => setForm((f) => ({ ...f, extraInstructions: e.target.value }))}
                      placeholder="e.g. Answer in blue or black ink"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="label-field" htmlFor="title">Title (optional)</label>
                    <input
                      id="title"
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. S2 Mathematics Quiz — Unit 3"
                      className="input-field"
                    />
                  </div>

                  <p className="flex items-start gap-2 rounded-lg bg-brand-green-light/60 px-3 py-2.5 text-[11px] leading-snug text-brand-green-dark">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Marks: the AI automatically gives each question its own marks based on the question's difficulty and length.
                    </span>
                  </p>
                </div>
              </details>
            </div>
          </section>

          <StepConnector state={result ? 'done' : doc ? 'active' : 'todo'} />

          {/* Step 3 — Generate */}
          <section className="card p-3.5 sm:p-4" aria-label="Step 3 — Generate assessment">
            <StepHeader number={3} state={result ? 'done' : generating ? 'active' : doc ? 'active' : 'todo'} title="Generate" icon={Sparkles} />
            <div className="mt-3">
              <button
                onClick={handleGenerate}
                disabled={!doc || generating}
                className="btn-primary w-full !py-3 !text-[15px] !rounded-xl !bg-gradient-to-r !from-brand-green-dark !to-brand-green shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {generating ? <Spinner size="sm" light /> : <Sparkles className="h-4 w-4" />}
                {generating ? 'Generating assessment...' : 'Generate Assessment'}
                {!generating && <ArrowRight className="h-4 w-4" />}
              </button>
              {!doc && (
                <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-400">
                  <AlertCircle className="h-3 w-3" /> Upload a course document first to enable generation.
                </p>
              )}
              {generateError && (
                <div className="mt-2">
                  <Alert type="error" message={generateError} onClose={() => setGenerateError(null)} />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right: result + library */}
        <div className="min-w-0 space-y-5">
          {result ? (
            <section className="card overflow-hidden" aria-label="Generated assessment">
              {/* Header + actions */}
              <div className="border-b border-slate-100 bg-gradient-to-r from-brand-green-light/70 via-white to-white px-4 py-3.5 sm:px-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-green-dark shadow-sm ring-1 ring-slate-200">
                        <TypeIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        {editing ? (
                          <input
                            type="text"
                            value={draft?.title || ''}
                            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                            className="input-field !py-1.5 text-sm font-bold text-slate-900"
                            aria-label="Assessment title"
                          />
                        ) : (
                          <h2 className="font-display truncate text-base font-bold text-slate-900">{result.title}</h2>
                        )}
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {form.subject ? `${form.subject} · ` : ''}Generated {generatedAt ? formatDateTime(generatedAt) : 'just now'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 ml-14 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${TYPE_META[form.type].chip}`}>
                        <TypeIcon className="h-3 w-3" /> {form.type}
                      </span>
                      {form.subject && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{form.subject}</span>
                      )}
                      {form.className && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{form.className}</span>
                      )}
                      {form.difficulty && form.difficulty !== 'Auto' && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">{form.difficulty}</span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SOURCE_META[result.source]?.cls || SOURCE_META.fallback.cls}`}>
                        {SOURCE_META[result.source]?.label || 'AI'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {result.questions.length} questions
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {result.questions.reduce((s, q) => s + (Number(q.marks) || 1), 0)} marks
                      </span>
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 flex-col gap-2 lg:w-auto">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving || editing}
                        className="btn-primary flex-1 justify-center !px-4 !py-2.5 !text-[13px] shadow-md sm:flex-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? <Spinner size="sm" light /> : <Save className="h-4 w-4" />}
                        {saving ? 'Saving...' : 'Save Assessment'}
                      </button>
                      <button
                        onClick={downloadPreviewPdf}
                        disabled={editing}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-brand-green-dark bg-white px-4 py-2 text-[13px] font-bold text-brand-green-dark shadow-sm transition hover:bg-brand-green-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                      >
                        <Download className="h-4 w-4" /> Download
                      </button>
                    </div>
                    {editing ? (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={applyEdit}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-green-dark px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-brand-green-deep"
                        >
                          <Check className="h-3.5 w-3.5" /> Done editing
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300"
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => downloadPdf({ title: result.title, type: form.type, subject: form.subject, className: form.className, questions: result.questions, timeAllowed: form.timeAllowed, extraInstructions: form.extraInstructions }, { markingGuide: true })}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark"
                        >
                          <FileCheck2 className="h-3.5 w-3.5" /> Marking guide
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadCSV(result)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark"
                        >
                          <Download className="h-3.5 w-3.5" /> CSV
                        </button>
                        <button
                          type="button"
                          onClick={startEditing}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerate}
                          disabled={generating}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                        </button>
                        <button
                          type="button"
                          onClick={discardResult}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-500 transition hover:border-rose-300 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {editing && (
                  <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
                    <Pencil className="h-3.5 w-3.5 shrink-0" />
                    Editing mode — changes apply to the preview, downloads and the saved copy.
                  </p>
                )}
              </div>

              {(saveNotice || saveError) && (
                <div className="space-y-2 px-4 pt-3 sm:px-6">
                  {saveNotice && <Alert type="success" message={saveNotice} onClose={() => setSaveNotice(null)} />}
                  {saveError && <Alert type="error" message={saveError} onClose={() => setSaveError(null)} />}
                </div>
              )}

              {/* Questions */}
              <ol className="space-y-2.5 px-3.5 py-3.5 sm:px-5">
                {(editing ? draft : result)?.questions.map((q, i) => (
                  <QuestionCard
                    key={i}
                    q={q}
                    index={i}
                    defaultOpen={i === 0}
                    editing={editing}
                    draft={draft}
                    onDraftChange={onDraftChange}
                  />
                ))}
              </ol>

              {/* Footer */}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-500 sm:px-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">
                  <ListChecks className="h-3 w-3" /> {result.questions.length} questions
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">
                  <Scale className="h-3 w-3" /> {result.questions.reduce((s, q) => s + (Number(q.marks) || 1), 0)} marks
                </span>
                <span className="min-w-0">
                  generated {result.source === 'gemini' ? 'with Gemini AI' : result.source === 'openai' ? 'with AI' : 'offline from the document'}.
                </span>
              </div>
            </section>
          ) : (
            <section className="card relative overflow-hidden px-5 py-8 sm:px-8" aria-label="Assessment preview">
              <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-brand-green-light blur-2xl" aria-hidden="true" />
              <div className="pointer-events-none absolute -left-14 -bottom-16 h-48 w-48 rounded-full bg-brand-gold/10 blur-2xl" aria-hidden="true" />
              <div className="relative mx-auto max-w-md text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green-light to-white text-brand-green-dark shadow-sm ring-1 ring-brand-green-soft">
                  <BrainCircuit className="h-8 w-8" />
                </span>
                <h2 className="font-display mt-4 text-lg font-bold text-slate-900">Your AI assessment will appear here</h2>
                <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500">
                  Upload course material, choose how it should be assessed, then let the AI build the paper for you.
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[11px] font-bold">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green-light/80 px-3 py-1.5 text-brand-green-dark ring-1 ring-inset ring-brand-green-soft">
                    <FileUp className="h-3.5 w-3.5" /> UPLOAD
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green-light/80 px-3 py-1.5 text-brand-green-dark ring-1 ring-inset ring-brand-green-soft">
                    <SlidersHorizontal className="h-3.5 w-3.5" /> CONFIGURE
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand-green-dark to-brand-green px-3 py-1.5 text-white shadow-sm">
                    <Sparkles className="h-3.5 w-3.5" /> GENERATE
                  </span>
                </div>

                <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                  Your generated questions, answers, explanations and assessment details will appear here.
                </p>
              </div>
            </section>
          )}

          {/* ── Library ───────────────────────────────────────── */}
          <section className="card overflow-hidden" aria-label="My assessment library">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 py-3.5 sm:px-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-green-light text-brand-green-dark">
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
                  <button onClick={() => setView(null)} className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-slate-700" aria-label="Close assessment preview">
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
                        <QuestionCard key={i} q={q} index={i} defaultOpen={i === 0} />
                      ))}
                    </ol>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => downloadPdf(view)}
                        className="btn-primary !px-3.5 !py-2 !text-[12px] !bg-gradient-to-r !from-brand-green-dark !to-brand-green shadow-md"
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

            {/* Toolbar */}
            {library && library.length > 0 && (
              <div className="space-y-2.5 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={libQ}
                    onChange={(e) => setLibQ(e.target.value)}
                    placeholder="Search by title, subject or class..."
                    aria-label="Search assessments"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-[13px] text-slate-700 shadow-sm placeholder-slate-400 transition hover:border-slate-400 focus:border-brand-green-dark focus:ring-2 focus:ring-brand-green-soft focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[130px] flex-1 sm:flex-none">
                    <select value={libType} onChange={(e) => setLibType(e.target.value)} aria-label="Filter by type" className={`${selectCls} pr-8`}>
                      <option value="all">All types</option>
                      {ASSESSMENT_TYPES.map((t) => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  </div>
                  <div className="relative min-w-[150px] flex-1 sm:flex-none">
                    <select value={libSubject} onChange={(e) => setLibSubject(e.target.value)} aria-label="Filter by subject" className={`${selectCls} pr-8`}>
                      <option value="all">All subjects</option>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  </div>
                  <div className="relative min-w-[140px] flex-1 sm:flex-none">
                    <select value={libSort} onChange={(e) => setLibSort(e.target.value)} aria-label="Sort assessments" className={`${selectCls} pr-8`}>
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  </div>
                </div>
              </div>
            )}

            {libraryLoading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : !library || library.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center text-slate-300">
                  <Inbox className="h-8 w-8" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-600">No saved assessments yet</p>
                <p className="mt-1 text-xs text-slate-400">
                  Generate an assessment above, then press <span className="font-semibold text-slate-500">Save Assessment</span> to keep it here.
                </p>
              </div>
            ) : filteredLibrary.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">
                No assessments match your filters. Try clearing the search or filters.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredLibrary.map((item) => {
                  const meta = TYPE_META[item.type] || TYPE_META.quiz;
                  const Icon = meta.icon;
                  return (
                    <li key={item._id} className="flex flex-col gap-3 px-4 py-4 transition hover:bg-brand-green-light/50 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.soft}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {badge(item)}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Saved
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Scale className="h-3 w-3" /> {item.marks || 0} marks
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" /> {formatDateTime(item.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex w-full shrink-0 flex-wrap gap-1.5 sm:w-auto sm:justify-end">
                        <button
                          onClick={() => openView(item._id)}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark sm:flex-none"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        <button
                          onClick={() => pdfFromId(item._id)}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark sm:flex-none"
                        >
                          <Download className="h-3.5 w-3.5" /> PDF
                        </button>
                        <button
                          onClick={() => markingFromId(item._id)}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark sm:flex-none"
                        >
                          <FileCheck2 className="h-3.5 w-3.5" /> Guide
                        </button>
                        <button
                          onClick={() => downloadFromId(item._id)}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark sm:flex-none"
                        >
                          <Download className="h-3.5 w-3.5" /> CSV
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          disabled={deletingId === item._id}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-500 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-50 sm:flex-none"
                        >
                          {deletingId === item._id ? <Spinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="flex items-start gap-2.5 rounded-2xl border border-brand-green-soft bg-brand-green-light/70 px-4 py-3 text-xs leading-relaxed text-slate-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-dark" />
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
