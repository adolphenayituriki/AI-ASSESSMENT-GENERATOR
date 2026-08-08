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

// When specific topics are selected, return the portions of the document that
// cover those topics (from each topic heading up to the next unit heading).
// For each topic the longest matching segment is kept so the table-of-contents
// stub is avoided in favour of the real unit content.
function selectTopicText(text, topics, limit = 50000) {
  const sel = Array.isArray(topics) ? topics.map((t) => String(t).trim()).filter(Boolean) : [];
  if (sel.length === 0) return text.slice(0, limit);
  const lower = text.toLowerCase();
  const heading = /\n\s*(UNIT|CHAPTER|LESSON|TOPIC|MODULE|PART)\b\s*[\dIVXLC]/i;
  const parts = [];
  for (const t of sel) {
    const tl = t.toLowerCase();
    let best = '';
    let from = 0;
    for (;;) {
      const idx = lower.indexOf(tl, from);
      if (idx === -1) break;
      const lineEnd = lower.indexOf('\n', idx);
      const segStart = lineEnd === -1 ? text.length : lineEnd + 1;
      const after = text.slice(segStart);
      const m = heading.exec(after);
      const segEnd = m ? segStart + m.index : text.length;
      const chunk = text.slice(segStart, segEnd).trim();
      if (chunk.length > best.length) best = chunk;
      from = idx + 1;
    }
    if (best) parts.push(best);
  }
  if (parts.length === 0) return text.slice(0, limit);
  let out = parts.join('\n\n');
  if (out.length > limit) out = out.slice(0, limit);
  return out;
}

function buildPrompt({ text, type, count, subject, className, title, difficulty, topics }) {
  const typeLabel = TYPES[type] || TYPES.quiz;
  const topicsNote =
    Array.isArray(topics) && topics.length > 0
      ? `\nFocus: Write questions ONLY about these selected topics: ${topics.join('; ')}. Do not go beyond them.\n`
      : '\nFocus: Cover the whole document.\n';

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

Diagram questions:
- For subjects like Geography, Biology, Physics and Chemistry, include 1 or 2 short-answer "draw and label" questions where a diagram is genuinely useful, e.g. "Draw and label a diagram of the internal structure of the earth", "Draw and label the water cycle", "Draw and label the layers of the atmosphere".
- Set "diagram": true ONLY on those questions. Diagram questions MUST NOT have options, and their "answer" field should describe what the labelled diagram must show.

Graph questions:
- For subjects that involve data or statistics (Geography statistical methods, Mathematics, Economics, Physics, Biology), include 1 short-answer question where the student must draw a graph on the printed axes, e.g. "Using the axes provided, draw a line graph to show the relationship between temperature and rainfall", "Using the axes provided, draw a simple bar graph to show the population growth".
- Set "graph": true ONLY on those questions. Graph questions MUST NOT have options. Provide short "graphX" and "graphY" axis labels (e.g. "Months" and "Rainfall (mm)") so the axes can be printed with labels.
- A question should use either "diagram": true OR "graph": true, never both.

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
  return `Read the course notes below and list the main topics or chapters covered in the document, like a table of contents for the subject.

Return ONLY valid JSON (no markdown fences), using this exact schema:
{"topics": ["Topic 1", "Topic 2", "..."]}

Guidelines:
- List ALL the topics or chapters covered in the document — every unit, chapter, lesson, module or main subject area you can find. Do not stop at a small number; the full list helps the teacher choose which topics to generate questions on.
- Only return the exact unit/chapter/lesson TITLES (e.g. "UNIT 3: CELLS"). Never return sentences, paragraphs, questions or descriptions — titles only.
- Use the exact names used in the document when they are clear (e.g. "Unit 3: Cells", "Chapter 5 — Climate", "Soil erosion").
- If the document has no clear chapters or units, list the main subject areas it covers.
- Write the topics in the SAME language as the document.
- Never invent topics that are not covered in the document.
- If the document is an exam paper, test or assessment (not teaching notes), return {"topics": []}.
- IGNORE document furniture and front matter — NEVER list: school names or mottos (e.g. "Quality Secondary Education"), school addresses (e.g. "Kinyababa Sector, Burera District, Rwanda"), the assessment/exam title (e.g. "Senior 5 Geography National Examination Assessment"), "STUDENT NAME", "INSTRUCTIONS", "SECTION A/B", "Total marks", "Time allowed", page numbers, the foreword, the acknowledgement, the dedication, the preface, the copyright page, "Table of Contents", or anything that is not a real subject topic or chapter.

COURSE NOTES:
${text.slice(0, 60000)}`;
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
    const topics = Array.isArray(parsed.topics) ? parsed.topics : [];
    return topics
      .map((t) => String(t).trim())
      .filter((t) => t.length > 1 && !isJunkTopic(t))
      .slice(0, 60);
  } catch {
    return [];
  }
}

async function generateTopics(text) {
  const offline = extractTopicsFallback(text);

  // Real unit/chapter headings detected directly in the text are the most
  // reliable, so prefer them over AI output.
  if (offline.some((t) => /^(UNIT|CHAPTER|LESSON|TOPIC|MODULE|PART)\b\s*[\dIVXLC]/i.test(t))) {
    return offline;
  }

  const prompt = buildTopicsPrompt(text);
  const system =
    'You are a curriculum analyst reading a course document. Respond as strict JSON with an array of topics named "topics". Only list the exact unit, chapter or lesson TITLES from the document (e.g. "UNIT 3: CELLS"). Never list sentences, paragraphs, forewords, acknowledgements or any front-matter text.';

  const providers = [];
  if (process.env.GEMINI_API_KEY) providers.push(() => callGemini(prompt, system));
  if (process.env.OPENAI_API_KEY || process.env.AI_API_KEY) providers.push(() => callOpenAI(prompt, system));

  for (const fn of providers) {
    try {
      const aiTopics = parseTopics(await fn());
      if (aiTopics.length >= 2) return aiTopics;
    } catch (error) {
      console.warn('[ai] topics provider failed:', error.message);
    }
  }

  return offline;
}

const PDF_JUNK_WORDS =
  /\b(students?|names?|registration|instructions?|answers?|questions?|marking|marks?|time\s+allowed|section|quality|school|sector|district|province|phone|email|teacher|signature|page|examination|exam|assessment|test|quiz|foreword|acknowledgements?|dedication|preface|contents|copyright|reserved|director|minister|government)\b/i;

// A topic title is furniture (not a real subject topic) if it looks like a PDF
// header, instruction, school motto, address, exam title, or front-matter text.
function isJunkTopic(topic) {
  const s = String(topic || '').trim();
  if (!s || s.length > 75) return true;
  if (PDF_JUNK_WORDS.test(s)) return true;
  if (/^(students?|names?|date|class|subject|teacher|school|section|instructions?|time\s+allowed|total\s+marks|registration|institution|address|phone|email|dear|finally|director|minister|head\s+of)\b/i.test(s)) return true;
  if (/^(i|in|this)\s/i.test(s)) return true;
  if (/national\s+(examination|assessment|exam)/i.test(s)) return true;
  if (/(quality|motto).*(secondary|school|education)/i.test(s)) return true;
  if (/(sector|district|province).*(rwanda)/i.test(s)) return true;
  if (/,$/i.test(s) || /\bREB\b/i.test(s) || /\bs[1-6]\b/i.test(s) || /\b(19|20)\d{2}\b/.test(s)) return true;
  return false;
}

function extractTopicsFallback(text) {
  const rawLines = (text || '')
    .split('\n')
    .map((l) => l.replace(/[#*_]/g, '').trim())
    .filter((l) => l.length >= 3 && l.length <= 120);

  const segments = [];
  for (const line of rawLines) {
    const parts = line.split(/(?=\b(?:UNIT|CHAPTER|LESSON|TOPIC|MODULE|PART)\b\s*[\dIVXLC]+[^A-Za-z0-9]*[A-Za-z])/i);
    for (const part of parts) {
      const t = part.trim();
      if (t) segments.push(t);
    }
  }

  const isHeading = (s) =>
    /^(UNIT|CHAPTER|LESSON|TOPIC|MODULE|PART)\b\s*[\dIVXLC]+[^A-Za-z0-9]*[A-Za-z]/i.test(s) ||
    /^\d{1,2}(\.\d+)*\.\s+[A-Z]/.test(s);

  const cleanTitle = (t) =>
    t
      .replace(/[.,;:]+$/, '')
      .replace(/[.\s]{2,}[\d\s]*$/, '')
      .replace(/\s+\d+$/, '')
      .trim();

  const topics = [];
  const seen = new Set();

  for (let i = 0; i < segments.length && topics.length < 60; i += 1) {
    const seg = segments[i];
    if (!isHeading(seg)) continue;
    if (PDF_JUNK_WORDS.test(seg)) continue;

    let title = cleanTitle(seg);
    for (let j = i + 1; j < segments.length; j += 1) {
      const next = segments[j].trim();
      if (!next || isHeading(next)) break;
      if (/^\d+$/.test(next) || PDF_JUNK_WORDS.test(next)) break;
      if (/[.!?]$/.test(next) || next.length > 45) break;
      if (title.length + next.length > 90) break;
      title += ' ' + next.replace(/[.,;:]+$/, '');
    }
    title = cleanTitle(title);

    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push(title);
  }

  if (topics.length >= 1) return topics;
  const kws = keywordRanks(text)
    .filter((k) => !PDF_JUNK_WORDS.test(k))
    .slice(0, 20);
  return kws.length >= 3 ? kws.map((k) => k.charAt(0).toUpperCase() + k.slice(1)) : [];
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

// Main entry: prefer configured AI providers, fall back to the offline generator.
async function generateAssessment(opts) {
  const providers = [];
  if (process.env.GEMINI_API_KEY) providers.push({ name: 'gemini', fn: generateWithGemini });
  if (process.env.OPENAI_API_KEY || process.env.AI_API_KEY) providers.push({ name: 'openai', fn: generateWithAI });

  let source = 'fallback';
  let result = null;

  for (const p of providers) {
    try {
      const out = await p.fn(opts);
      if (out) {
        source = p.name;
        result = out;
        break;
      }
    } catch (error) {
      console.warn(`[ai] ${p.name} failed, trying next provider:`, error.message);
    }
  }

  if (!result) result = generateFallback(opts);

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

module.exports = { extractText, generateAssessment, generateTopics, generateFallback };
