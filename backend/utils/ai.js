const pdfParseMod = require('pdf-parse');
const mammoth = require('mammoth');
const { levelProfile, subjectStrategy, DIFFICULTY_DESCRIPTORS } = require('./assessmentFramework');

// pdf-parse ships two APIs: v1 exports a function, v2 exports a PDFParse class.
async function pdfText(buffer) {
  if (typeof pdfParseMod === 'function') {
    const data = await pdfParseMod(buffer);
    return (data.text || '').trim();
  }
  const PDFParse = pdfParseMod.PDFParse || pdfParseMod.PdfParse;
  if (PDFParse) {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return (result.text || '').trim();
  }
  throw new Error('pdf-parse is not configured correctly');
}

// Extract plain text from an uploaded PDF / DOCX / TXT buffer.
async function extractText(file) {
  const ext = (file.originalname || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    return pdfText(file.buffer);
  }
  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return (result.value || '').trim();
  }
  return file.buffer.toString('utf8').replace(/^\uFEFF/, '').trim();
}

const TYPES = {
  quiz: 'a short quiz',
  exam: 'a full exam',
  exercise: 'a practice exercise',
  homework: 'homework assignments',
};

// System-level instructions for assessment generation. Gemini creates
// curriculum-aligned questions from its own knowledge of Rwanda's education
// system (REB standards). Uploaded notes are optional supplementary context.
const ASSESSMENT_SYSTEM_PROMPT =
  'You are a senior national examiner in Rwanda who writes examination papers aligned with REB (Rwanda Education Board) curriculum ' +
  'standards and the national assessment framework. You create clear, well-structured questions from your own knowledge of the subject ' +
  'and Rwanda\'s school syllabus. You never fabricate facts, never copy text from any source into a question, never use templates ' +
  'such as "Complete the sentence", and never write questions about a document (authors, foreword, pages, sections, table of contents). ' +
  'Every question must be a clear, standalone exam question that a student who has studied the subject can answer without any reference ' +
  'material. Respond as strict JSON matching the requested schema, with keys in English and values in the language of the notes.';


const QUESTION_SCHEMA_HINT = `{
  "title": "A short title for the assessment",
  "questions": [
    {
      "type": "choice",
      "question": "the question text",
      "marks": 1,
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "brief reason the answer is correct",
      "svg": ""
    },
    {
      "type": "true_false",
      "question": "a statement to judge (include a short reason request when appropriate)",
      "marks": 2,
      "options": ["True", "False"],
      "correctIndex": 0,
      "explanation": "why the statement is true or false",
      "svg": ""
    },
    {
      "type": "calculation",
      "question": "a calculation or work-out command",
      "marks": 4,
      "options": [],
      "correctIndex": -1,
      "answer": "the expected working and final answer",
      "explanation": "brief note on marking",
      "diagram": false,
      "graph": false,
      "graphX": "label for the horizontal axis (only when graph is true)",
      "graphY": "label for the vertical axis (only when graph is true)",
      "svg": ""
    }
  ]
}`;

const SUBHEADING = /\n\s*\d{1,2}(\.\d{1,3}){1,2}\s*\p{Lu}/u;

// Heading markers ("Unit", "UNIT", "Chapter", ...) written as explicit char
// classes so the following NUMBER part can stay case-SENSITIVE. With the old
// /\b(UNIT|...)\b\s*[\dIVXLC]+/iu pattern, the lowercase "i" in an ordinary
// sentence like "unit is introduced ..." matched the roman-numeral class and
// turned sentence fragments into fake topics. Now only "Unit 1", "Unit V",
// "CHAPTER 3", "Lesson 2", etc. are treated as headings — lowercase filler
// like "unit is", "part into halves" or "unit 8 assessment" is never a topic.
const MARKER =
  '(?:[Uu][Nn][Ii][Tt]|[Cc][Hh][Aa][Pp][Tt][Ee][Rr]|[Ll][Ee][Ss][Ss][Oo][Nn]|[Tt][Oo][Pp][Ii][Cc]|[Mm][Oo][Dd][Uu][Ll][Ee]|[Pp][Aa][Rr][Tt])';
const HEADER_NUM = '[0-9IVXLC]+';
const HEADING_LINE_RE = new RegExp(`^${MARKER}\\b\\s*${HEADER_NUM}[^\\p{L}\\p{N}]*[\\p{L}]`, 'u');
const HEADING_SPLIT_RE = new RegExp(`(?=\\b${MARKER}\\b\\s*${HEADER_NUM}[^\\p{L}\\p{N}]*[\\p{L}])`, 'u');
// Lenient version used only to bound a topic segment: the next marker+number.
const HEADING_BOUND_RE = new RegExp(`\\n\\s*${MARKER}\\b\\s*${HEADER_NUM}`, 'u');

function sliceFromEndOfLine(text, idx) {
  const lineEnd = text.indexOf('\n', idx);
  return lineEnd === -1 ? text.length : lineEnd + 1;
}

// The longest block of text belonging to one topic: from the topic heading
// (or first mention) up to the next UNIT/CHAPTER/... heading.
function topicSegment(text, topicName) {
  const lower = text.toLowerCase();
  const name = topicName.toLowerCase();
  let best = '';
  let from = 0;
  for (;;) {
    const idx = lower.indexOf(name, from);
    if (idx === -1) break;
    const segStart = sliceFromEndOfLine(lower, idx);
    const after = text.slice(segStart);
    const m = HEADING_BOUND_RE.exec(after);
    const segEnd = m ? segStart + m.index : text.length;
    const chunk = text.slice(segStart, segEnd).trim();
    if (chunk.length > best.length) best = chunk;
    from = idx + 1;
  }
  return best;
}

// The longest block of text belonging to one subtopic inside a topic segment:
// from the subtopic heading up to the next numbered sub-heading.
function subtopicText(segment, subtopic) {
  const lower = segment.toLowerCase();
  const name = subtopic.toLowerCase();
  let best = '';
  let from = 0;
  for (;;) {
    const idx = lower.indexOf(name, from);
    if (idx === -1) break;
    const segStart = sliceFromEndOfLine(lower, idx);
    const after = segment.slice(segStart);
    const m = SUBHEADING.exec(after);
    const segEnd = m ? segStart + m.index : segment.length;
    const chunk = segment.slice(segStart, segEnd).trim();
    if (chunk.length > best.length) best = chunk;
    from = idx + 1;
  }
  return best;
}

// When topics are selected, return the portions of the document that cover
// them. Each topic may carry an optional list of subtopics; when present, only
// the matching sub-sections are included. For each topic the longest matching
// segment is kept so the table-of-contents stub is avoided in favour of the
// real unit content.
function selectTopicText(text, topics, limit = 50000) {
  const sel = normalizeTopics(topics);
  if (sel.length === 0) return trimSlice(text, limit);
  const parts = [];
  for (const t of sel) {
    const seg = topicSegment(text, t.name);
    if (!seg) continue;
    if (t.subtopics.length) {
      let combined = '';
      for (const sub of t.subtopics) {
        const subSeg = subtopicText(seg, sub);
        if (subSeg) combined += (combined ? '\n\n' : '') + subSeg;
      }
      if (combined) {
        parts.push(combined);
        continue;
      }
    }
    parts.push(seg);
  }
  if (parts.length === 0) return trimSlice(text, limit);
  let out = parts.join('\n\n');
  if (out.length > limit) out = trimSlice(out, limit);
  return out;
}

// Truncate long document slices at a line or sentence boundary so the model
// never reads half a word or a broken table cell at the end of the prompt.
function trimSlice(text, limit) {
  const max = Math.max(0, Number(limit) || 0);
  if (text.length <= max) return text;
  const piece = text.slice(0, max);
  const nl = piece.lastIndexOf('\n');
  const dot = piece.lastIndexOf('. ');
  const cut = Math.max(nl, dot);
  return cut >= max * 0.6 ? piece.slice(0, cut + 1).trim() : piece;
}

// Accept topics in either shape — an array of strings ("UNIT 1: CELLS") or an
// array of { name, limit, subtopics } objects — and normalise to the object
// shape. "limit" is the maximum number of questions for that topic (0 = the
// whole topic, no cap); "subtopics" restricts the topic to chosen sub-sections.
function normalizeTopics(topics) {
  if (!Array.isArray(topics)) return [];
  const seen = new Set();
  const out = [];
  for (const t of topics) {
    if (!t) continue;
    const isObj = typeof t === 'object';
    const name = String(isObj ? t.topic || t.name : t).trim();
    if (!name) continue;
    const key = normalizeTopicKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    const limit = isObj ? Math.max(0, Math.min(50, parseInt(t.limit, 10) || 0)) : 0;
    const subtopics = (isObj && Array.isArray(t.subtopics) ? t.subtopics : [])
      .map((s) => String(s).trim())
      .filter((s) => s);
    out.push({ name, limit, subtopics });
  }
  return out;
}

// Tell the model how to distribute the questions across the selected topics.
// Topics with a limit get exactly that many questions; topics without a limit
// are covered as whole topics; the remainder (if any) comes from the rest of
// the document.
function buildFocusNote(topics, count) {
  const sel = normalizeTopics(topics);
  if (sel.length === 0) {
    return '\nFocus: Cover the whole document evenly across its topics.\n';
  }
  const lines = sel.map((t) => {
    const subNote = t.subtopics.length ? ` (subtopics: ${t.subtopics.join('; ')})` : '';
    return t.limit > 0
      ? `- ${t.name} — write exactly ${t.limit} question${t.limit === 1 ? '' : 's'}${subNote}.`
      : `- ${t.name} — the whole topic; write as many questions as it deserves${subNote}.`;
  });
  const limited = sel.some((t) => t.limit > 0);
  let note = `\nQuestion distribution (the total must still be ${count} questions):\n${lines.join('\n')}`;
  note += limited
    ? `\nIf the per-topic limits sum to less than ${count}, write the remaining questions across the whole document.\n`
    : '\nWrite questions ONLY about the topics listed above; do not go beyond them.\n';
  return note;
}

const VISUAL_SUBJECTS = ['geography', 'biology', 'physics', 'chemistry', 'science', 'agriculture', 'social studies', 'history', 'expressive arts'];
const GRAPH_SUBJECTS = ['geography', 'mathematics', 'math', 'economics', 'physics', 'biology', 'statistics', 'computer science'];

// Subjects with a visual or data component should carry visual questions; for
// every other subject the AI still adds one when a question is genuinely
// clearer with a drawing or a graph. The AI chooses the BEST format per
// question (diagram draw-box or labelled graph axes).
function buildVisualNote(subject, count) {
  const s = String(subject || '').toLowerCase();
  const needsVisual =
    VISUAL_SUBJECTS.some((k) => s.includes(k)) || GRAPH_SUBJECTS.some((k) => s.includes(k));
  const required = needsVisual
    ? `\nVisual questions (REQUIRED for a ${subject || 'visual'} assessment): this paper MUST include at least 1 visual question.`
    : '\nVisual questions: if any question in this paper is genuinely clearer with a visual (a drawing or a graph), include it.';
  return `${required} For each visual question, choose the format that best tests the content — "diagram": true for anything the student must draw and label (structure, cross-section, map, flow chart, timeline, experimental set-up, circuit, cycle, ecosystem), or "graph": true for anything the student must plot on labelled axes (line, bar, histogram, curve). Set the flag ONLY on those questions (never both), and keep them to a sensible number for ${count} questions (1-2 unless the paper is long). Visual questions MUST NOT have options: give them marks and an "answer" describing what the drawing/graph must show, and when "graph": true also provide the "graphX" and "graphY" axis labels.\n`;
}

// Types of question and how to spread them inside ONE paper, so an assessment
// is not a wall of identical questions (e.g. only MCQs or only recall).
const TYPE_NOTE = [
  'Question type "type" for every question — pick the one that fits best:',
  '- "choice": 4-option multiple choice (one correct "correctIndex").',
  '- "true_false": a factual statement paired with the option pair ["True", "False"]; still set "correctIndex" and explain in the "explanation".',
  '- "calculation": a mathematical working-out question with an "answer" (e.g. "Calculate ...", "Work out ...", "A farmer ... how many ...?").',
  '- "short": a short open answer (e.g. "Define ...", "Name ...", "State TWO ...").',
  '- "practice": an everyday application or practice problem based on real Rwandan contexts (prices at the market, seasons, school, transport, farming).',
  '- "open": a longer open/essay-style answer (structured question, explain-and-justify, describe-and-draw).',
].join('\n');

function buildMixNote(type, count) {
  const n = Math.max(3, count);
  const spreads = {
    quiz: `Approximately 55-65% "choice"/"true_false", 15-25% "calculation"/"practice", 15-25% "short"/"open".`,
    exam: `Structure it like a real Rwandan paper: a first section of "choice" and "true_false" questions, a middle section of "calculation" and "short", and a final section of longer "practice"/"open" questions.`,
    exercise: `Lean on "calculation", "practice" and "short" (working-through type questions), with a few "choice" checks mixed in.`,
    homework: `A balanced mix of "choice", "short", "calculation" and "practice" questions a student can attempt alone.`,
  };
  const base = spreads[type] || spreads.quiz;
  return (
    `\nMIXED question types (required): Do not repeat one style. ${base}\n` +
    `Once the paper has ${n >= 8 ? '8 or more' : `${n} questions`}, use at least 3 different question types (choice, true_false, calculation, short, practice, open). Let the correct type flow from the content: a fact → "choice" or "true_false"; a computation → "calculation"; a definition → "short"; a real-life situation in Rwanda → "practice"; a bigger explain/justify task → "open". Never more than two questions of the same type in a row. Open/structured questions test understanding and reasoning, not recall of the document.\n` +
    `${TYPE_NOTE}\n`
  );
}

const SVG_RULES = [
  'EMBEDDED FIGURES — "svg" field:',
  '- A question is clearer WITH a figure when the student must READ it: a given number line, a labelled geometric shape or angle, a line/bar/pie chart with data, a data table, a clock, a map, a weighing scale, a circuit, a labelled diagram.',
  '- For every such question embed a self-contained figure in "svg". Set "svg": "" for questions that need no figure.',
  '- Make the SVG a standalone drawing: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 X">. White background; thick black or very dark grey strokes (stroke-width="2"); labels and numbers in a plain readable sans-serif (font-family="Arial, sans-serif", font-size="14", fill="#111")  placed OFF the stroke so they never overlap; axes drawn as lines with small arrow-heads and labelled ticks where a scale is shown.',
  '- Build figures from simple shapes only: <line>, <rect>, <circle>, <path>, <polygon>, <text>. No images, no scripts, no <foreignObject>, no external files, every tag closed.',
  '- Keep every figure COMPACT and cheap to print: viewBox width 640, fewer than 40 elements, only the data/labels the student needs.',
  '- Do NOT include the question text, options or answer inside the SVG. The figure shows ONLY the given data, shape or scale the student reads (e.g. the number line with point A marked, the triangle with side lengths, the bar chart with values).',
  '- The question text must tell the student what to do with the figure ("Write the value shown at A on the number line below", "Using the information in the bar chart, ..."), and remain answerable from the figure alone.',
].join('\n');

function buildSvgNote(subject, count) {
  const s = String(subject || '').toLowerCase();
  const figureHeavy =
    s.includes('mathemat') ||
    s.includes('math') ||
    s.includes('physic') ||
    s.includes('chemist') ||
    s.includes('geograph') ||
    s.includes('statist') ||
    s.includes('econom') ||
    s.includes('biolog') ||
    s.includes('science') ||
    s.includes('social');
  const minFigures = figureHeavy ? Math.min(3, Math.max(1, Math.round(count / 4))) : Math.min(2, Math.max(1, Math.round(count / 5)));
  return (
    `\nFIGURES:\n- This paper should include at least ${minFigures} question${minFigures === 1 ? '' : 's'} that carries an embedded "svg" figure (a figure the student READS). Use more freely wherever a real Rwandan paper would print a diagram, graph or data table.\n` +
    `${SVG_RULES}\n`
  );
}

// Difficulty guidance. "Auto" asks for a naturally-progressing paper; any other
// selection sets both the overall level and how the paper is spread.
function buildDifficultyNote(difficulty) {
  if (!difficulty || difficulty === 'Auto') {
    return '\nDifficulty: Write a balanced paper — open with accessible questions, then progress to harder application and reasoning questions.\n';
  }
  const d = String(difficulty).toLowerCase();
  const descriptor = DIFFICULTY_DESCRIPTORS[difficulty] || DIFFICULTY_DESCRIPTORS.Moderate;
  const spread =
    d === 'easy'
      ? 'Keep the whole paper accessible: mostly one-step recall and simple application, with at most a couple of slightly harder questions.'
      : d === 'advanced'
        ? 'Make the paper demanding: most questions require multi-step reasoning, application, analysis or evaluation; only a couple are recall questions.'
        : 'Balance the paper: roughly half straightforward questions and half that require reasoning and application.';
  return `\nDifficulty: ${difficulty} — ${spread} Aim for this quality: "${descriptor}".\n`;
}

// Cognitive (Bloom) spread calibrated by class level and requested difficulty,
// so the paper is not a wall of one-note recall questions.
function buildCognitiveNote(profile, difficulty) {
  const bloomRef =
    'Bloom levels for calibration: Remember = recall facts and terms; Understand = explain ideas in your own words; Apply = use knowledge in a situation or problem; Analyze = compare, examine causes and effects, relationships; Evaluate = justify a judgment using criteria; Create = design, produce or propose.\n';
  if (profile.primary || profile.code === 'nursery') {
    return `\nCognitive spread: favour clear recall, understanding and everyday application; keep analysis gentle and avoid full evaluate/create tasks. ${bloomRef}`;
  }
  const d = String(difficulty || '').toLowerCase();
  if (d === 'easy') {
    return `\nCognitive spread: mostly recall and understanding with some simple application. ${bloomRef}`;
  }
  if (d === 'advanced') {
    return `\nCognitive spread: strongly higher-order — application, analysis and evaluation with some create tasks, and only a little recall. ${bloomRef}`;
  }
  return `\nCognitive spread: mix levels so the paper is not pure recall — roughly 30% recall and understanding, 40% application and interpretation, 30% analysis and evaluation. ${bloomRef}`;
}

function buildPrompt({ text, type, count, subject, className, title, difficulty, topics }) {
  const varietySeed = Math.random().toString(36).slice(2, 10);
  const topicsNote = buildFocusNote(topics, count);
  const visualNote = buildVisualNote(subject, count);
  const profile = levelProfile(className);
  const levelNote = profile.note
    ? `\nClass level (calibrate wording, question length and mark values to this):\n- ${profile.note}\n`
    : '';
  const subjectNote = `\nSubject technique (follow it):\n- ${subjectStrategy(subject)}\n`;

  const difficultyNote = buildDifficultyNote(difficulty);
  const cognitiveNote = buildCognitiveNote(profile, difficulty);
  const mixNote = buildMixNote(type, count);
  const svgNote = buildSvgNote(subject, count);

  const materialNote = [
    'HOW TO USE THE COURSE NOTES BELOW:',
    'The COURSE NOTES are optional supplementary reference. You may use them to verify facts, confirm topic scope, or choose Rwanda-specific examples.',
    'You are NOT limited to the notes. Draw on your full knowledge of the subject and Rwanda\'s REB curriculum to create exam-worthy questions.',
    'If the notes are incomplete, missing a topic, or not provided, generate questions entirely from your own knowledge of the subject.',
    'Do NOT copy sentences from the notes into questions, and do NOT ask "according to the notes", "according to the document", or any question that only a reader of the uploaded file could answer.',
  ].join('\n');

  const stemNote = [
    '\nClear question stems (clarity is a top priority):',
    '- Write stems as short, direct questions or commands — "Describe ...", "Explain why ...", "Calculate ...", "What is the role of ...?" — in the style of real school papers.',
    '- Each stem must be STANDALONE and self-contained: a student must understand it on its own, without the document and without relying on other questions.',
    '- Test one clear idea per question; keep sentences short; use grade-appropriate vocabulary; avoid double negatives and vague wording.',
    '- Prefer questions that test understanding and application ("why", "how", "compare", "calculate", "apply") over lazy recall ("define", "state", "list") — but keep enough accessible recall so weaker students can attempt the paper.',
  ].join('\n');

  const mcqNote = [
    '\nMultiple-choice quality (applies to every MCQ):',
    '- Exactly 4 options, ONE clearly correct, and 3 plausible-but-clearly-wrong distractors.',
    '- Wrong options must be wrong for a genuine reason: a common misconception, an inverted relationship, a wrong value or a reversed condition — never obviously absurd or comical.',
    '- Keep the options parallel and of similar length so the correct answer is never signalled by option length or wording.',
    '- NO "all of the above", "none of the above", "both a and b" or "not sure". The correctIndex must point to the one option that is factually correct.',
  ].join('\n');

  const marksNote =
    '\nMarks: Give EVERY question a "marks" value that fits its type, length and difficulty — 1-2 marks for a multiple-choice question, 2-4 for a short-answer question, 4-6 for a structured, diagram or graph question, 6-10 for a longer extended/essay question. Keep the marking consistent: questions of the same size and demand carry the same marks; do not inflate marks.\n';

  const distinctNote =
    '\nDistinctness and layout:\n- No two questions may test the same fact; each question must add a new point.\n- Order the paper like a real test: start with the easier recall questions and end with the harder application and analysis questions.\n';

  const exampleNote = [
    '\nGOOD vs POOR (study this before writing):',
    '- POOR (material-echo): "According to the notes, what is soil erosion?"  or  "Complete the sentence: Soil erosion is ___."',
    '- GOOD (clear exam question referring to the subject, informed by — but not copying — the notes):',
    '  "Describe TWO human activities that accelerate soil erosion in Rwanda and suggest one conservation practice farmers can use to reduce it."',
    '- POOR: "Which page of the document discussed photosynthesis?"',
    '- GOOD: "Explain why a plant kept in a dark room for several days produces less oxygen, and name the part of the plant cell where photosynthesis takes place."',
  ].join('\n');

  const checkNote = [
    '\nFINAL CHECK (silently verify all of this before you respond):',
    '1. Every MCQ has exactly 4 options and its correctIndex points to the factually correct option.',
    '2. Every open question has a complete, accurate model "answer" grounded in the subject matter.',
    '3. No two questions are duplicates or near-duplicates.',
    '4. No question depends on having read the document ("according to the notes", pages, authors, sections, front matter).',
    `5. There are exactly ${count} questions and their marks are consistent.`,
    `6. Every question is genuine curriculum-based exam content — not a template, not a placeholder, not copied from a source.`,
    '7. Length discipline: keep every "explanation" to at most two short sentences, keep "answer" values concise (working + final result), and keep SVGs compact. Do not pad.',
  ].join('\n');

  const formatNote = [
    `\nPaper structure for "${type}" (${count} questions total):`,
    type === 'exam'
      ? '- Section A: "choice" and "true_false" questions (fast, 1-2 marks each).\n- Section B: "calculation" and "short" questions (2-4 marks each).\n- Section C: longer "practice"/"open" questions (5-8 marks each).'
      : type === 'quiz'
        ? '- Mostly "choice" questions with a mix of "true_false", "calculation" and "short" — quiz-style with a quick answer key.'
        : type === 'homework'
          ? '- A balanced set of "choice", "short", "calculation" and "practice" questions suitable for working alone at home.'
          : '- Mainly "calculation", "practice" and "short" working-out questions with a few "choice" checks.',
    'Number the questions 1, 2, 3, ... in the order they should be answered.',
  ].join('\n');

  return `You are a senior national examiner in Rwanda, aligned with REB (Rwanda Education Board) curriculum standards, writing a ${type === 'quiz' || type === 'exam' ? 'formal examination paper' : 'class exercise'}.

Task: Write exactly ${count} clear, exam-worthy questions for ${subject || 'the subject'}${className ? `, class ${className}` : ''}${title ? `, titled "${title}"` : ''}. Generate every question from your own knowledge of the subject and Rwanda's curriculum. If course notes are provided below, you may use them as optional supplementary reference to verify facts or choose Rwanda-specific examples — but you are not limited to their content.

Language: Write all questions, options, answers, explanations and the title in the SAME language as the COURSE NOTES below (English, Kinyarwanda or French — match the notes). Only the JSON field names stay in English.

${materialNote}

${stemNote}

${mcqNote}${exampleNote}

${cognitiveNote}
${difficultyNote}${levelNote}${subjectNote}
${formatNote}
${mixNote}
${svgNote}
- Every question needs a short "explanation" for the teacher's answer key that states why the answer/option is correct.
${visualNote}
${distinctNote}${marksNote}
${topicsNote}
${checkNote}
Variety seed: ${varietySeed} — use this to ensure your questions are original and different from any standard or previously generated paper. Do not repeat common template questions.
Respond with ONLY valid JSON (no markdown fences), using this exact schema:
${QUESTION_SCHEMA_HINT}

Metadata: subject="${subject}", class="${className}", title="${title || ''}", difficulty="${difficulty || 'Auto'}".

COURSE NOTES (reference source):
${selectTopicText(text, topics, 50000)}`;
}

async function callOpenAI(promptText, system) {
  const apiKey = (process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '').trim();
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  if (!apiKey) return null;
  if (apiKey.length < 20) {
    throw new Error('OPENAI_API_KEY/AI_API_KEY in backend/.env does not look like a valid API key.');
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_tokens: 16000,
      messages: [
        { role: 'system', content: system || 'You are a senior national examiner in Rwanda aligned with REB curriculum standards. You create clear, standalone exam questions from your own knowledge of the subject. If course notes are provided, they are optional supplementary reference only. Never copy text from any source, never ask "according to the notes", and never write questions about a document itself. Respond as strict JSON.' },
        { role: 'user', content: promptText },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`AI request failed (${response.status}) ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini(promptText, system) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  // "gemini-flash-latest" resolves to the newest flash (e.g. 3.8), which is
  // often unavailable under demand spikes for new-user keys. 3.6-flash is the
  // stable flash on this account. Still overridable via GEMINI_MODEL.
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  if (!apiKey) return null;
  if (!GEMINI_KEY_RE.test(apiKey)) {
    throw new Error(`GEMINI_API_KEY in backend/.env does not look like a valid API key. ${GEMINI_KEY_HINT}.`);
  }

  // Transient 503 ("high demand") responses are common on shared/free plans;
  // retry them a couple of times with a short backoff before giving up.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await sleep(2500 * attempt);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${system ? `${system}\n\n` : ''}${promptText}` }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 32768,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 200);
      if (response.status === 429) {
        lastError = new Error(
          `Gemini temporary limit reached (rate or free-tier quota). Wait a few minutes, reduce the number of questions, or add billing on your Gemini API account.`
        );
      } else {
        lastError = new Error(`Gemini request failed (${response.status}) ${detail}`);
      }
      if (response.status !== 503) throw lastError;
      continue; // retry transient capacity errors
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    if (!content) throw new Error('Gemini returned an empty response');
    return content;
  }
  throw lastError || new Error('Gemini request failed');
}

async function generateWithAI(opts) {
  const content = await callOpenAI(buildPrompt(opts), ASSESSMENT_SYSTEM_PROMPT);
  return content ? parseQuestions(content) : null;
}

async function generateWithGemini(opts) {
  const content = await callGemini(buildPrompt(opts), ASSESSMENT_SYSTEM_PROMPT);
  return content ? parseQuestions(content) : null;
}

function parseQuestions(content) {
  let cleaned = (content || '').trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response was not valid JSON');
  }
  cleaned = cleaned.slice(start, end + 1);

  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch (err) {
      return null;
    }
  };

  // A few models wrap valid JSON inside another JSON string. Only in that case
  // (payload starts/ends with a quote) do we unescape once — never on normal
  // JSON, which legitimately contains \" sequences inside SVG strings.
  const unescapeWrapper = (s) =>
    s.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');

  let parsed = tryParse(cleaned);
  const wrapped = cleaned.match(/^"([\s\S]*)"$/);
  if (!parsed && wrapped) {
    const unescaped = unescapeWrapper(wrapped[1]);
    parsed = tryParse(unescaped);
  }

  if (!parsed) {
    // Still invalid — usually truncation when the AI cut off a long paper in
    // the middle of the "questions" array. Salvage every complete question
    // object so the teacher still gets a usable paper. If the whole payload
    // was escaped (wrapper case above that failed), try that form too.
    let recovered = recoverQuestionsArray(cleaned);
    if (recovered.length === 0 && /\\"/.test(cleaned)) {
      recovered = recoverQuestionsArray(unescapeWrapper(cleaned));
    }
    if (recovered.length === 0) {
      throw new Error('AI response was not valid JSON');
    }
    return {
      title: extractTitle(cleaned),
      partial: true,
      partialReason:
        'The AI response was cut off; only the questions returned completely are included.',
      questions: recovered.map(normalizeQuestion).filter(Boolean),
    };
  }

  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
  if (questions.length === 0) throw new Error('AI response contained no questions');

  return {
    title: String(parsed.title || '').trim() || null,
    questions: questions.map(normalizeQuestion).filter(Boolean),
  };
}

function extractTitle(json) {
  const m = json.match(/"title"\s*:\s*"((?:\\.|[^"\\])*)"/);
  return m ? m[1].replace(/\\"/g, '"').trim() || null : null;
}

// Scan a broken/truncated JSON payload and pull out every complete top-level
// object inside the "questions" array. Elements that do not parse (e.g. the
// final cut-off question) are silently dropped.
function recoverQuestionsArray(json) {
  const q = json.indexOf('"questions"');
  if (q === -1) return [];
  const open = json.indexOf('[', q);
  if (open === -1) return [];
  const items = [];
  let depth = 0;
  let inStr = false;
  let esc = false;
  let start = -1;
  for (let i = open; i < json.length; i += 1) {
    const c = json[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
    } else if (c === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (c === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        try {
          const obj = JSON.parse(json.slice(start, i + 1));
          if (obj && typeof obj === 'object') items.push(obj);
        } catch (err) {
          // skip the malformed element
        }
        start = -1;
      }
    }
  }
  return items;
}

// Turn a model-produced SVG into a safe image data URI we can hand to the
// frontend. Rejects anything not a single <svg> root and strips scripts, event
// handlers and embedded HTML so an SVG can never execute in the browser.
function safeSvgFigure(svg) {
  let s = String(svg || '').trim();
  if (!s) return null;
  if (!/^<svg[\s>]/i.test(s) || !/<\/svg>\s*$/i.test(s)) return null;
  if (/<script|<foreignObject|<\/html|<iframe/i.test(s)) return null;
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[\w.]+)/gi, '');
  s = s.replace(/<style\b[\s\S]*?<\/style>/gi, '');
  if (/<script|<foreignObject|<iframe/i.test(s)) return null;
  if (!/xmlns=/.test(s)) s = s.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
}

function computeQuestionType(q, isMcq) {
  const t = String(q.type || '').toLowerCase().trim();
  if (['choice', 'true_false', 'calculation', 'short', 'practice', 'open'].includes(t)) return t;
  if (isMcq) return 'choice';
  if (q.answer) return 'short';
  return 'open';
}

function normalizeQuestion(q) {
  if (!q || typeof q !== 'object' || !q.question) return null;
  const isMcq = Array.isArray(q.options) && q.options.length >= 2;
  const type = computeQuestionType(q, isMcq);
  const diagramFlag = q.diagram === true;
  const graphFlag = q.graph === true;
  if (isMcq) {
    const options = q.options.slice(0, 4).map((o) => String(o || '').trim());
    let correctIndex = Number.isInteger(q.correctIndex) ? q.correctIndex : -1;
    if (correctIndex < 0 || correctIndex >= options.length) correctIndex = 0;
    return {
      type,
      question: String(q.question).trim(),
      marks: Math.max(1, Number(q.marks) || 1),
      options,
      correctIndex,
      answer: '',
      explanation: String(q.explanation || '').trim(),
      diagram: diagramFlag,
      graph: graphFlag,
      graphX: String(q.graphX || '').trim(),
      graphY: String(q.graphY || '').trim(),
      figure: safeSvgFigure(q.svg),
      figureSpec: String(q.figureSpec || q.figSpec || '').trim(),
    };
  }
  return {
    type,
    question: String(q.question).trim(),
    marks: Math.max(1, Number(q.marks) || 1),
    options: [],
    correctIndex: -1,
    answer: String(q.answer || '').trim(),
    explanation: String(q.explanation || '').trim(),
    diagram: diagramFlag,
    graph: graphFlag,
    graphX: String(q.graphX || '').trim(),
    graphY: String(q.graphY || '').trim(),
    figure: safeSvgFigure(q.svg),
    figureSpec: String(q.figureSpec || q.figSpec || '').trim(),
  };
}

function buildTopicsPrompt(text) {
  return `Read the course notes below and list ALL the topics or chapters covered in the document, like a table of contents for the subject.

Return ONLY valid JSON (no markdown fences), using this exact schema:
{"topics": [{"topic": "UNIT 1: CELLS", "subtopics": ["1.1 Cell structure", "1.2 Cell division"]}]}

Guidelines:
- List ALL the topics or chapters covered in the document — every unit, chapter, lesson, module, section or theme you can find. Do not stop at a small number; the full list helps the teacher choose what to test.
- For EACH topic, also list its SUBTOPICS: the numbered subsections or sub-headings inside it (e.g. "1.1 ...", "1.2 ..."), using the exact names from the document. If a topic has no clear subtopics, use an empty array [].
- Only return the exact unit/chapter/lesson TITLES and their subsection titles (e.g. "UNIT 3: CELLS"). Never return sentences, paragraphs, questions or descriptions — titles only.
- Use the exact names used in the document when they are clear (e.g. "Unit 3: Cells", "Chapter 5 — Climate", "Soil erosion").
- If the document has no clear chapters or units, list the main subject areas it covers, each with its subsections where possible.
- Write the topics and subtopics in the SAME language as the document.
- Never invent topics or subtopics that are not covered in the document.
- If the document is an exam paper, test or assessment (not teaching notes), return {"topics": []}.
- IGNORE document furniture and front matter — NEVER list: school names or mottos (e.g. "Quality Secondary Education"), school addresses (e.g. "Kinyababa Sector, Burera District, Rwanda"), the assessment/exam title (e.g. "Senior 5 Geography National Examination Assessment"), "STUDENT NAME", "INSTRUCTIONS", "SECTION A/B", "Total marks", "Time allowed", page numbers, the foreword, the acknowledgement, the dedication, the preface, the copyright page, "Table of Contents", or anything that is not a real subject topic or chapter.

COURSE NOTES:
${text.slice(0, 150000)}`;
}

function parseTopics(content) {
  let cleaned = (content || '').trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const raw = Array.isArray(parsed.topics) ? parsed.topics : [];
    const out = [];
    const seen = new Set();
    for (const t of raw) {
      const isObj = t && typeof t === 'object';
      const name = String(isObj ? t.topic || t.name : t).trim();
      if (!name || isJunkTitle(name)) continue;
      const key = normalizeTopicKey(name);
      if (seen.has(key)) continue;
      seen.add(key);
      const subtopics = (isObj && Array.isArray(t.subtopics) ? t.subtopics : [])
        .map((s) => String(s).trim())
        .filter((s) => s.length > 1 && /\p{L}/u.test(s) && !isJunkTitle(s));
      out.push({ name, subtopics: [...new Set(subtopics)] });
      if (out.length >= 60) break;
    }
    return out;
  } catch {
    return [];
  }
}

function normalizeTopicKey(t) {
  return String(t || '')
    .toLowerCase()
    .replace(/[.,;:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Combine the precise headings found in the full text (offline) with the
// broader list the AI produces from a large slice of the document. Headings
// come first because they are exact; AI subtopics are added when a heading has
// none, so nothing is lost.
function mergeTopics(headings, aiTopics, limit = 60) {
  const byKey = new Map();
  const add = (t) => {
    if (!t || typeof t !== 'object') return;
    const name = String(t.name || t.topic || '').trim();
    const key = normalizeTopicKey(name);
    if (!name || !key || isJunkTitle(name)) return;
    const subs = (t.subtopics || []).map((s) => String(s).trim()).filter(Boolean);
    const existing = byKey.get(key);
    if (existing) {
      existing.subtopics = [...new Set([...existing.subtopics, ...subs])];
    } else {
      byKey.set(key, { name, subtopics: [...new Set(subs)] });
    }
  };
  (headings || []).forEach(add);
  (aiTopics || []).forEach(add);
  return [...byKey.values()].slice(0, limit);
}

async function generateTopics(text) {
  // First scan the ENTIRE document for real heading lines. This is not
  // truncated, so it catches every UNIT/CHAPTER/... heading in a long book.
  const headings = extractTopicsFallback(text);

  const prompt = buildTopicsPrompt(text);
  const system =
    'You are a curriculum analyst reading a course document. Respond as strict JSON with an array of topics named "topics". Each topic is an object with "topic" (the exact unit, chapter or lesson TITLE, e.g. "UNIT 3: CELLS") and "subtopics" (its numbered subsections, or []). Never list sentences, paragraphs, forewords, acknowledgements or any front-matter text.';

  const providers = [];
  if (process.env.GEMINI_API_KEY) providers.push(() => callGemini(prompt, system));
  if (process.env.OPENAI_API_KEY || process.env.AI_API_KEY) providers.push(() => callOpenAI(prompt, system));

  // When AI is configured, always ask it for the full list and merge it with
  // the offline headings, so the teacher sees every topic in the document.
  for (const fn of providers) {
    try {
      const aiTopics = parseTopics(await fn());
      if (aiTopics.length >= 2) return mergeTopics(headings, aiTopics);
    } catch (error) {
      console.warn('[ai] topics provider failed:', error.message);
    }
  }

  return headings;
}

// A topic title is furniture (not a real subject topic) when it IS one of the
// document's non-subject parts: a foreword, an address, a school motto, an exam
// form field, a page marker, etc. Merely CONTAINING a common word like "school"
// or "government" does not make a topic junk — "School Rules", "Physical
// Education" and "Local Government" are real subject topics and must be kept.
function isJunkTitle(s) {
  const t = String(s || '').trim();
  if (!t || t.length < 3 || t.length > 75) return true;

  // Document furniture, exactly as the whole heading
  if (/^(foreword|acknowledgements?|dedication|preface|table of contents|copyright|about (this|the) (book|document)|references?|bibliography|appendices?|glossary|student'?s? name|instructions?|time allowed|total marks)\b/i.test(t)) return true;

  // Exam-paper form fields
  if (/^(name|date|class|subject|section|school|teacher|registration number|address|phone|e-?mail|dear|head of school)\b/i.test(t)) return true;

  // PDF page markers and page headers
  if (/^(page|pg|p)\.?\s*\d+\b/i.test(t)) return true;
  if (/^--?\s*\d+\s+(of|sur)\s+\d+\s*-?$/i.test(t)) return true;

  // Addresses, mottos and institutional boilerplate
  if (/(sector|district|province)\b[^\n]*\brwanda\b/i.test(t)) return true;
  if (/(quality|motto)\b[^\n]*\b(secondary|education|school)\b/i.test(t)) return true;
  if (/national\s+(examination|assessment|exam)\b/i.test(t)) return true;
  if (/\b(r\.?e\.?b|nera|republic of rwanda|ministry of education|rwanda (basic )?education board)\b/i.test(t)) return true;
  if (/(copyright|all rights reserved|the property of)\b/i.test(t)) return true;

  // Trailing oddities
  if (/,$/.test(t)) return true;
  if (/\b(19|20)\d{2}\b/.test(t)) return true;
  return false;
}

// Offline topic detection: scans the FULL document (no truncation) for heading
// lines and groups numbered sub-headings under their parent topic, so the
// result is a topic -> subtopics tree.
function extractTopicsFallback(text) {
  const rawLines = (text || '')
    .split('\n')
    .map((l) => l.replace(/[#*_]/g, '').trim())
    .filter((l) => l.length >= 3 && l.length <= 120);

  const segments = [];
  for (const line of rawLines) {
    const parts = line.split(HEADING_SPLIT_RE);
    for (const part of parts) {
      const t = part.trim();
      if (t) segments.push(t);
    }
  }

  const isUnitHeading = (s) => new RegExp(`^${MARKER}\\b`, 'u').test(s);
  const isTopHeading = (s) => HEADING_LINE_RE.test(s);
  // Numbered sub-headings (e.g. "1.1 Cell structure", "2.3 Climate")
  const isSubHeading = (s) => /^\d{1,2}\.\d{1,3}(\.\d{1,2})?\s*\p{Lu}/u.test(s);

  const cleanTitle = (t) =>
    t
      .replace(/[.,;:]+$/, '')
      .replace(/[.\s]{2,}[\d\s]*$/, '')
      .replace(/\s+\d+$/, '')
      .trim();

  const topics = [];
  const seen = new Set();
  const pushTopic = (title, subtopics = []) => {
    title = cleanTitle(title);
    const key = normalizeTopicKey(title);
    if (!title || !key || seen.has(key) || isJunkTitle(title)) return;
    // Reject sentence fragments that are not headings (e.g. "unit is
    // introduced with an activity to enable learners", "part into halves.").
    if (/^\p{Ll}/u.test(title)) return;
    seen.add(key);
    const subs = [...new Set(subtopics.map((s) => cleanTitle(s)).filter(Boolean))].filter(
      (s) => normalizeTopicKey(s) !== key && !isJunkTitle(s)
    );
    topics.push({ name: title, subtopics: subs });
  };

  let current = null;
  let currentSubs = [];

  for (let i = 0; i < segments.length && topics.length < 60; i += 1) {
    const seg = segments[i];
    const isTop = isTopHeading(seg);
    const isSub = isSubHeading(seg);

    if (isTop) {
      if (current) pushTopic(current, currentSubs);
      current = seg;
      currentSubs = [];
      for (let j = i + 1; j < segments.length; j += 1) {
        const next = segments[j].trim();
        if (!next || isTopHeading(next) || isSubHeading(next)) break;
        if (/^\d+$/.test(next) || isJunkTitle(next)) break;
        if (/[.!?]$/.test(next) || next.length > 45) break;
        if (current.length + next.length > 90) break;
        current += ' ' + next.replace(/[.,;:]+$/, '');
      }
      continue;
    }

    if (isSub && current) {
      let sub = seg;
      for (let j = i + 1; j < segments.length; j += 1) {
        const next = segments[j].trim();
        if (!next || isTopHeading(next) || isSubHeading(next)) break;
        if (/^\d+$/.test(next) || isJunkTitle(next)) break;
        if (/[.!?]$/.test(next) || next.length > 45) break;
        if (sub.length + next.length > 90) break;
        sub += ' ' + next.replace(/[.,;:]+$/, '');
      }
      currentSubs.push(sub);
    }
  }
  if (current) pushTopic(current, currentSubs);

  return topics;
}

// ---- Offline fallback: keyword + sentence based generator --------------------
// REMOVED. Mock template questions ("Complete the sentence", "Explain in your own
// words") were confusing teachers — assessments now come only from a real AI
// provider (Gemini first, then OpenAI). ------------------------------------------------------------------

// Google issues Gemini keys in more than one format (classic "AIza..." keys and
// newer "AQ..." keys). We cannot tell a good key from a bad one by prefix, so we
// only sanity-check length/charset and let the live API be the real validator.
//
// A too-short or clearly bogus value in backend/.env is a configuration error we
// should surface instead of silently producing nothing.
const GEMINI_KEY_RE = /^[A-Za-z0-9._~-]{20,}$/;
const GEMINI_KEY_HINT = 'Update GEMINI_API_KEY in backend/.env with a key from https://aistudio.google.com/apikey';

// Main entry: real AI providers only — Gemini first, OpenAI-compatible next.
// There is deliberately NO offline mock generator: a teacher must never see
// fake "complete the sentence" questions. If no provider can generate, we fail
// loudly with an actionable message.
async function generateAssessment(opts) {
  const normalized = { ...opts, topics: normalizeTopics(opts.topics) };

  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const openaiKey = (process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '').trim();

  if (geminiKey && !GEMINI_KEY_RE.test(geminiKey)) {
    throw new Error(`GEMINI_API_KEY in backend/.env does not look like a valid API key. ${GEMINI_KEY_HINT}.`);
  }
  if (!geminiKey && !openaiKey) {
    throw new Error(
      'No AI provider is configured. Add a valid GEMINI_API_KEY or OPENAI_API_KEY to backend/.env.'
    );
  }

  const providers = [];
  if (geminiKey) providers.push({ name: 'gemini', fn: generateWithGemini });
  if (openaiKey && openaiKey.length >= 20) providers.push({ name: 'openai', fn: generateWithAI });

  let source = null;
  let result = null;
  let lastError = null;

  for (const p of providers) {
    try {
      const out = await p.fn(normalized);
      if (out) {
        source = p.name;
        result = out;
        break;
      }
    } catch (error) {
      console.warn(`[ai] ${p.name} failed:`, error.message);
      lastError = error;
    }
  }

  if (!result) {
    throw new Error(
      `Assessment generation failed. ${lastError ? lastError.message : 'No AI provider produced questions.'}`
    );
  }

  const generatedTitle =
    opts.title ||
    `${opts.subject || 'General'} ${TYPES[opts.type] || 'quiz'} — ${new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;

  return {
    source,
    title: result.title || generatedTitle,
    questions: result.questions,
  };
}

module.exports = { extractText, generateAssessment, generateTopics, normalizeTopics, parseQuestions };
