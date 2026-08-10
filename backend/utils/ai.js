const pdfParseMod = require('pdf-parse');
const mammoth = require('mammoth');

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


const QUESTION_SCHEMA_HINT = `{
  "title": "A short title for the assessment",
  "questions": [
    {
      "question": "the question text",
      "marks": 1,
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "brief reason the answer is correct",
      "diagram": false
    },
    {
      "question": "a short-answer question text",
      "marks": 3,
      "answer": "the expected model answer",
      "explanation": "brief note on marking",
      "diagram": false,
      "graph": false,
      "graphX": "label for the horizontal axis (only when graph is true)",
      "graphY": "label for the vertical axis (only when graph is true)"
    }
  ]
}`;

const SUBHEADING = /\n\s*\d{1,2}(\.\d{1,3}){1,2}\s*\p{Lu}/u;

function sliceFromEndOfLine(text, idx) {
  const lineEnd = text.indexOf('\n', idx);
  return lineEnd === -1 ? text.length : lineEnd + 1;
}

// The longest block of text belonging to one topic: from the topic heading
// (or first mention) up to the next UNIT/CHAPTER/... heading.
function topicSegment(text, topicName) {
  const lower = text.toLowerCase();
  const name = topicName.toLowerCase();
  const heading = /\n\s*(UNIT|CHAPTER|LESSON|TOPIC|MODULE|PART)\b\s*[\dIVXLC]/i;
  let best = '';
  let from = 0;
  for (;;) {
    const idx = lower.indexOf(name, from);
    if (idx === -1) break;
    const segStart = sliceFromEndOfLine(lower, idx);
    const after = text.slice(segStart);
    const m = heading.exec(after);
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
  if (sel.length === 0) return text.slice(0, limit);
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
  if (parts.length === 0) return text.slice(0, limit);
  let out = parts.join('\n\n');
  if (out.length > limit) out = out.slice(0, limit);
  return out;
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
    const limit = isObj ? Math.max(0, Math.min(30, parseInt(t.limit, 10) || 0)) : 0;
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
  return `${required} For each visual question, choose the format that best tests the content — "diagram": true for anything the student must draw and label (structure, cross-section, map, flow chart, timeline, experimental set-up, circuit, cycle, ecosystem), or "graph": true for anything the student must plot on labelled axes (line, bar, histogram, curve). Set the flag ONLY on those questions (never both), keep them to a sensible number for ${count} questions (1-2 unless the paper is long), and give them marks and an "answer" describing what the drawing/graph must show.\n`;
}

function buildPrompt({ text, type, count, subject, className, title, difficulty, topics }) {
  const typeLabel = TYPES[type] || TYPES.quiz;
  const topicsNote = buildFocusNote(topics, count);

  const difficultyNote =
    difficulty && difficulty !== 'Auto'
      ? `\nDifficulty: Write questions of ${difficulty.toLowerCase()} difficulty — ${
          difficulty === 'Easy'
            ? 'clear, straightforward recall and simple application.'
            : difficulty === 'Advanced'
              ? 'challenging, multi-step questions that require deep understanding and application.'
              : 'a balanced mix of recall and application.'
        }\n`
      : '';

  const marksNote = `\nMarks allocation: Give EVERY question a "marks" value (points) using your own judgement of the question's difficulty and length — for example 1 mark for a simple multiple-choice question, 2-3 marks for a short-answer question, 4-6 marks for a longer structured, diagram or graph question. Marks do NOT have to be equal across questions.\n`;

  const visualNote = buildVisualNote(subject, count);

  return `You are an experienced teacher and national examiner in Rwanda preparing students for school tests and the Rwandan national examinations.

Task: Write exactly ${count} REAL exam questions for ${subject || 'the subject'}${className ? `, class ${className}` : ''}${title ? `, assessment titled "${title}"` : ''}, based ONLY on the course notes below. The questions must look and feel exactly like the questions students actually write in real school exams and national papers — they must test genuine knowledge and understanding of the subject matter.

Language: Write all questions, options, answers and explanations in the SAME language as the course notes below (if the notes are in English, write in English; if in Kinyarwanda or French, write in that language).

The questions must test the ACTUAL SUBJECT CONTENT, for example:
- Definitions, meanings and explanations of concepts.
- Causes, effects, processes, differences and comparisons.
- Classifications, examples, functions and importance.
- Real-world application (e.g. in Rwanda): "Describe two effects of soil erosion on farming in Rwanda", "Explain how rotation of the earth causes day and night", "Why are forests important for rain formation?".
- Questions that make students think and apply what they learned, not just recall the document layout.

STRICTLY FORBIDDEN — NEVER write questions about the document itself:
- NO questions about who wrote, edited or signed the foreword, preface, acknowledgement, introduction or dedication.
- NO questions about copyright years, publishers, ISBNs, or "who is the Director General of REB".
- NO questions about page numbers, section/subsection numbers or table-of-contents listings (e.g. "Which subsection covers X?", "What unit starts on page 51?", "Which section is titled ...?").
- NO questions about document abbreviations (CTLR, CTLRD, REB) or document structure.
- NO questions that only someone who read the front matter of the book could answer.

Title: Choose a short, professional title such as "Senior 5 Geography Exam" or "S3 Mathematics Exercise — Unit 2". Never use the words "national", "national examination" or "national assessment" in the title, and never include any school name or abbreviation in the title.

Format by type:
- quiz and exam: mostly multiple-choice questions (exactly 4 options, one correct "correctIndex") plus a few short-answer questions, like Section A of a real Rwandan exam paper.
- exercise and homework: mostly short-answer and structured questions with an "answer" field.
- Every question needs a short "explanation" for the teacher's answer key.

Visual questions (choose the BEST visual format for each question):
- Whenever a question is genuinely clearer with a visual, mark it with the right flag so the PDF prints the correct drawing area:
  * "diagram": true — anything the student must draw and label (biological structure, cross-section, a map sketch, a flow chart, a timeline, an experimental set-up, a circuit, the water cycle, an ecosystem, etc.). The PDF prints an empty draw box.
  * "graph": true — anything the student must plot on axes (line, bar, histogram, polygon, curve). The PDF prints labelled axes from the "graphX" and "graphY" labels.
- Decide per question which visual best tests the content — do NOT force diagrams or graphs where a plain question is better, and do not use a drawing when the content clearly needs a graph (or vice versa).
- Visual questions MUST NOT have options. Set "diagram": true OR "graph": true (never both). Their "answer" field must describe what the labelled drawing/graph must show, and "graphX"/"graphY" are required when "graph": true.
${visualNote}
${difficultyNote}${marksNote}
${topicsNote}
Respond with ONLY valid JSON (no markdown fences), using this exact schema:
${QUESTION_SCHEMA_HINT}

Metadata: subject="${subject}", class="${className}", title="${title || ''}", difficulty="${difficulty || 'Auto'}".

COURSE NOTES:
${selectTopicText(text, topics, 50000)}`;
}

async function callOpenAI(promptText, system) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  if (!apiKey) return null;

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        { role: 'system', content: system || 'You are a national examiner in Rwanda writing real school exam questions that test subject knowledge. Never write questions about the document itself (authors, forewords, page numbers, section numbers, table of contents). Respond as strict JSON.' },
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
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  if (!apiKey) return null;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${system ? `${system}\n\n` : ''}${promptText}` }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gemini request failed (${response.status}) ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!content) throw new Error('Gemini returned an empty response');
  return content;
}

async function generateWithAI(opts) {
  const content = await callOpenAI(buildPrompt(opts));
  return content ? parseQuestions(content) : null;
}

async function generateWithGemini(opts) {
  const content = await callGemini(buildPrompt(opts));
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

  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
  if (questions.length === 0) throw new Error('AI response contained no questions');

  return {
    title: String(parsed.title || '').trim() || null,
    questions: questions.map(normalizeQuestion).filter(Boolean),
  };
}

function normalizeQuestion(q) {
  if (!q || typeof q !== 'object' || !q.question) return null;
  const isMcq = Array.isArray(q.options) && q.options.length >= 2;
  if (isMcq) {
    const options = q.options.slice(0, 4).map((o) => String(o || '').trim());
    let correctIndex = Number.isInteger(q.correctIndex) ? q.correctIndex : -1;
    if (correctIndex < 0 || correctIndex >= options.length) correctIndex = 0;
    return {
      question: String(q.question).trim(),
      marks: Math.max(1, Number(q.marks) || 1),
      options,
      correctIndex,
      answer: '',
      explanation: String(q.explanation || '').trim(),
      diagram: q.diagram === true,
      graph: q.graph === true,
      graphX: String(q.graphX || '').trim(),
      graphY: String(q.graphY || '').trim(),
    };
  }
  return {
    question: String(q.question).trim(),
    marks: Math.max(1, Number(q.marks) || 1),
    options: [],
    correctIndex: -1,
    answer: String(q.answer || '').trim(),
    explanation: String(q.explanation || '').trim(),
    diagram: q.diagram === true,
    graph: q.graph === true,
    graphX: String(q.graphX || '').trim(),
    graphY: String(q.graphY || '').trim(),
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

// Blacklist used ONLY for the keyword fallback (single-word "topics" when no
// real headings exist), where generic words would make useless chips.
const KEYWORD_JUNK =
  /\b(students?|school|teacher|subject|class|section|instructions?|questions?|answers?|marking|marks?|time\s+allowed|exam|examination|assessment|test|quiz|page|foreword|acknowledgements?|dedication|preface|contents|copyright|reserved|director|minister|government|education|rwanda|institution|registration|name|date)\b/i;

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
    const parts = line.split(
      /(?=\b(?:UNIT|CHAPTER|LESSON|TOPIC|MODULE|PART)\b\s*[\dIVXLC]+[^\p{L}\p{N}]*[\p{L}])/iu
    );
    for (const part of parts) {
      const t = part.trim();
      if (t) segments.push(t);
    }
  }

  const isUnitHeading = (s) => /^(UNIT|CHAPTER|LESSON|TOPIC|MODULE|PART)\b/iu.test(s);
  const isTopHeading = (s) =>
    isUnitHeading(s) && /^(UNIT|CHAPTER|LESSON|TOPIC|MODULE|PART)\b\s*[\dIVXLC]+[^\p{L}\p{N}]*[\p{L}]/iu.test(s);
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

  if (topics.length >= 1) return topics;
  const kws = keywordRanks(text)
    .filter((k) => !KEYWORD_JUNK.test(k))
    .slice(0, 20);
  return kws.length >= 3 ? kws.map((k) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), subtopics: [] })) : [];
}

// ---- Offline fallback: keyword + sentence based generator --------------------

const STOPWORDS = new Set(
  'the a an and or but of in on for with to from is are was were be been being as at by it its this that these those which who whom whose there their they he she we you your our not no yes so than then when where what how do does did has have had can could will would should may might must all any each more most other some such only own same very just also about into over after before between during through under again further once here'.split(
    ' '
  )
);

// Remove PDF page markers, copyright notices and front matter so the offline
// generator does not build questions from the book's cover/foreword pages.
function cleanDocumentText(text) {
  return (text || '')
    .replace(/--\s*\d+\s+of\s+\d+\s*--/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      if (/^\d+\s*$/.test(l)) return false;
      if (/^[ivxlc]+\.?$/i.test(l)) return false;
      if (/©|all rights reserved|the property of|published by/i.test(l)) return false;
      if (/^(foreword|acknowledgements?|dedication|preface|table of contents|copyright|about this book)\b/i.test(l)) return false;
      if (/^(r\.?e\.?b|director general|ministry of education|education board|head of curriculum)\b/i.test(l)) return false;
      if (/student'?s? book/i.test(l)) return false;
      if (/^[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*,\s*$/i.test(l)) return false;
      return true;
    })
    .join('\n');
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 20 &&
        s.length < 260 &&
        /\d|[A-Za-z]{3}/.test(s) &&
        !/^\s*[•\-\d.]+\s*$/.test(s) &&
        !/wish to (sincerely )?(extend|express)|appreciation|gratitude|contributed towards|director general|r\.?e\.?b|student'?s? book|all rights reserved|the property of|this book is|foreword|acknowledgement/i.test(s)
    );
}

function keywordRanks(text) {
  const freq = {};
  (text.toLowerCase().match(/[a-z]{4,}/g) || []).forEach((w) => {
    if (!STOPWORDS.has(w)) freq[w] = (freq[w] || 0) + 1;
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([w]) => w);
}

function generateFallback({ text, type, count, subject, className, title, topics }) {
  const source = cleanDocumentText(selectTopicText(text, topics, 60000));
  const sentences = splitSentences(source);
  if (sentences.length === 0) {
    throw new Error('Not enough readable text to build an assessment from this document.');
  }

  const keywords = keywordRanks(source).slice(0, 60);
  const picked = [];
  const keySentences = [];
  for (const kw of keywords) {
    const found = sentences.find((s) => s.toLowerCase().includes(kw) && !picked.includes(s));
    if (found) {
      picked.push(found);
      keySentences.push(found);
    }
    if (keySentences.length >= Math.min(Math.ceil(count * 1.5), sentences.length)) break;
  }
  const pool = keySentences.length >= 4 ? keySentences : sentences;

  const mcqTarget = type === 'exercise' || type === 'homework' ? Math.ceil(count / 2) : count;
  const questions = [];
  const used = new Set();

  for (let i = 0; i < pool.length && questions.length < mcqTarget; i += 1) {
    const s = pool[i];
    const kw = keywords.find((k) => s.toLowerCase().includes(k)) || s.toLowerCase().match(/[a-z]{5,}/)?.[0];
    if (!kw) continue;
    const distractors = keywords.filter((k) => k !== kw && !s.toLowerCase().includes(k)).slice(0, 3);
    if (distractors.length < 3) continue;

    const blank = s.replace(new RegExp(`\\b${kw}\\b`, 'i'), '______');
    const options = [kw, ...distractors].sort(() => Math.random() - 0.5);
    const qText = `Complete the sentence: "${blank}"`;
    if (used.has(qText)) continue;
    used.add(qText);
    questions.push({
      question: qText,
      marks: 1,
      options,
      correctIndex: options.indexOf(kw),
      answer: '',
      explanation: `The notes state: "${s}"`,
    });
  }

  for (let i = 0; i < pool.length && questions.length < count; i += 1) {
    const s = pool[(i * 7 + 3) % pool.length];
    const qText = `Explain in your own words: "${s}"`;
    if (used.has(qText)) continue;
    used.add(qText);
    questions.push({
      question: qText,
      marks: 3,
      options: [],
      correctIndex: -1,
      answer: s,
      explanation: 'Base your answer on this statement from the notes.',
    });
  }

  const qs = questions.slice(0, count);

  return { title: null, questions: qs };
}

// Offline generation that respects per-topic limits: each limited topic
// produces up to its own quota of questions, then the remainder comes from the
// other selected topics (or the whole document when nothing else is selected).
function generateFallbackDistributed(opts) {
  const { topics = [], count } = opts;
  const limited = topics.filter((t) => t.limit > 0);
  const unlimited = topics.filter((t) => t.limit <= 0);
  if (limited.length === 0) return generateFallback(opts);

  const questions = [];
  for (const t of limited) {
    const remaining = count - questions.length;
    if (remaining <= 0) break;
    const n = Math.min(t.limit, remaining);
    const seg = selectTopicText(opts.text, [{ name: t.name, subtopics: t.subtopics }], 60000);
    if (!seg || seg.trim().length < 50) continue;
    const r = generateFallback({ ...opts, text: seg, count: n, topics: [] });
    questions.push(...r.questions);
  }
  const remaining = count - questions.length;
  if (remaining > 0) {
    const seg = unlimited.length ? selectTopicText(opts.text, unlimited, 60000) : opts.text;
    const r = generateFallback({ ...opts, text: seg, count: remaining, topics: [] });
    questions.push(...r.questions);
  }
  return { title: null, questions: questions.slice(0, count) };
}

// Main entry: prefer configured AI providers, fall back to the offline generator.
async function generateAssessment(opts) {
  const normalized = { ...opts, topics: normalizeTopics(opts.topics) };
  const providers = [];
  if (process.env.GEMINI_API_KEY) providers.push({ name: 'gemini', fn: generateWithGemini });
  if (process.env.OPENAI_API_KEY || process.env.AI_API_KEY) providers.push({ name: 'openai', fn: generateWithAI });

  let source = 'fallback';
  let result = null;

  for (const p of providers) {
    try {
      const out = await p.fn(normalized);
      if (out) {
        source = p.name;
        result = out;
        break;
      }
    } catch (error) {
      console.warn(`[ai] ${p.name} failed, trying next provider:`, error.message);
    }
  }

  if (!result) result = generateFallbackDistributed(normalized);

  const fallbackTitle =
    opts.title ||
    `${opts.subject || 'General'} ${TYPES[opts.type] || 'quiz'} — ${new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;

  return {
    source,
    title: result.title || fallbackTitle,
    questions: result.questions,
  };
}

module.exports = { extractText, generateAssessment, generateTopics, generateFallback, normalizeTopics };
