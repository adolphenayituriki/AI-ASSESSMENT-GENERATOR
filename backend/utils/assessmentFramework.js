'use strict';

// ---------------------------------------------------------------------------
// DuFast EduAi — Assessment Framework
// Shared, pure-logic backbone for academically rigorous assessment design in
// Rwanda's education system. Used by the AI generation engine (utils/ai.js),
// the offline generator and the API layer. Kept free of network/DB concerns.
// ---------------------------------------------------------------------------

// --- Bloom's taxonomy ------------------------------------------------------
const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

const BLOOM_DESCRIPTORS = {
  Remember: 'recall of facts, terms, definitions and procedures taught explicitly',
  Understand: 'explaining ideas in your own words, interpreting and clarifying meaning',
  Apply: 'using knowledge in a known or slightly new situation; carrying out a procedure',
  Analyze: 'breaking material into parts, comparing, examining relationships and reasons',
  Evaluate: 'making judgments using criteria, weighing evidence, justifying a position',
  Create: 'producing new work or original reasoning: essays, designs, solutions, projects',
};

// --- Cognitive levels (the teacher-facing control) ------------------------
const COGNITIVE_LEVELS = ['Basic', 'Balanced', 'Higher Order Thinking', 'Custom'];

// Percentage of questions at each Bloom level for each cognitive preset.
const COGNITIVE_PROFILES = {
  Basic: { Remember: 50, Understand: 30, Apply: 15, Analyze: 5, Evaluate: 0, Create: 0 },
  Balanced: { Remember: 25, Understand: 25, Apply: 25, Analyze: 15, Evaluate: 5, Create: 5 },
  'Higher Order Thinking': { Remember: 10, Understand: 15, Apply: 25, Analyze: 25, Evaluate: 15, Create: 10 },
  Custom: null, // teacher-supplied
};

// --- Difficulty calibration ------------------------------------------------
const DIFFICULTY_LEVELS = ['Easy', 'Moderate', 'Difficult', 'Advanced', 'Exam Standard'];

const DIFFICULTY_DESCRIPTORS = {
  Easy: 'single recall step or one direct application; one obvious route to the answer',
  Moderate: 'a short chain of reasoning (1-3 steps) or direct application of one taught concept',
  Difficult: 'a longer chain of reasoning, transfer to a new situation, or tighter distractors',
  Advanced: 'multi-step reasoning, problem decomposition, synthesis, or extended evaluation',
  'Exam Standard': 'comparable to professionally prepared national-examination items: precise wording, layered reasoning, exacting mark allocation and high-quality distractors',
};

// --- Question types ---------------------------------------------------------
const QUESTION_TYPE_CATALOG = {
  'multiple-choice': { group: 'objective', label: 'Multiple Choice', marks: '1-2' },
  'true-false': { group: 'objective', label: 'True / False', marks: '1' },
  matching: { group: 'objective', label: 'Matching', marks: '1 per item' },
  'fill-in-blank': { group: 'objective', label: 'Fill in the blank', marks: '1' },
  'multiple-response': { group: 'objective', label: 'Multiple response', marks: '2' },
  definition: { group: 'short-answer', label: 'Definition', marks: '1-2' },
  explain: { group: 'short-answer', label: 'Explain', marks: '2-4' },
  compare: { group: 'short-answer', label: 'Compare', marks: '2-4' },
  differentiate: { group: 'short-answer', label: 'Differentiate', marks: '2-4' },
  'give-reasons': { group: 'short-answer', label: 'Give reasons', marks: '2-4' },
  interpret: { group: 'short-answer', label: 'Interpret', marks: '2-4' },
  calculate: { group: 'short-answer', label: 'Calculate', marks: '2-5' },
  structured: { group: 'structured', label: 'Structured (multi-part)', marks: '4-10' },
  'problem-solving': { group: 'structured', label: 'Problem solving', marks: '4-8' },
  'case-study': { group: 'structured', label: 'Case / scenario', marks: '4-10' },
  'data-interpretation': { group: 'structured', label: 'Data interpretation', marks: '4-8' },
  essay: { group: 'extended', label: 'Essay / extended response', marks: '6-15' },
};

// --- Assessment modes -------------------------------------------------------
const ASSESSMENT_MODES = {
  'quick-quiz': {
    label: 'Quick Quiz',
    desc: 'Short formative check of recently taught content.',
    defaultCount: 10,
    duration: '30 minutes',
    sections: [
      { label: 'Section A', typeGroup: 'objective', desc: 'Objective questions', pct: 60 },
      { label: 'Section B', typeGroup: 'short-answer', desc: 'Short answer questions', pct: 40 },
    ],
  },
  'class-test': {
    label: 'Class Test',
    desc: 'Balanced assessment for classroom testing.',
    defaultCount: 12,
    duration: '80 minutes',
    sections: [
      { label: 'Section A', typeGroup: 'objective', desc: 'Objective questions', pct: 40 },
      { label: 'Section B', typeGroup: 'short-answer', desc: 'Short answer questions', pct: 30 },
      { label: 'Section C', typeGroup: 'structured', desc: 'Structured questions', pct: 30 },
    ],
  },
  homework: {
    label: 'Homework',
    desc: 'Application and practice focused take-home work.',
    defaultCount: 8,
    duration: 'Take-home',
    sections: [
      { label: 'Section A', typeGroup: 'short-answer', desc: 'Practice questions', pct: 45 },
      { label: 'Section B', typeGroup: 'structured', desc: 'Application and problem solving', pct: 55 },
    ],
  },
  'mid-term': {
    label: 'Mid-Term Exam',
    desc: 'Broader topic coverage and multiple cognitive levels.',
    defaultCount: 16,
    duration: '2 hours',
    sections: [
      { label: 'Section A', typeGroup: 'objective', desc: 'Objective questions', pct: 30 },
      { label: 'Section B', typeGroup: 'short-answer', desc: 'Short answer questions', pct: 30 },
      { label: 'Section C', typeGroup: 'structured', desc: 'Structured questions', pct: 25 },
      { label: 'Section D', typeGroup: 'extended', desc: 'Extended response', pct: 15 },
    ],
  },
  'end-term': {
    label: 'End-of-Term Exam',
    desc: 'Comprehensive assessment across the term.',
    defaultCount: 18,
    duration: '2 hours 40 minutes',
    sections: [
      { label: 'Section A', typeGroup: 'objective', desc: 'Objective questions', pct: 25 },
      { label: 'Section B', typeGroup: 'short-answer', desc: 'Short answer questions', pct: 25 },
      { label: 'Section C', typeGroup: 'structured', desc: 'Structured questions', pct: 30 },
      { label: 'Section D', typeGroup: 'extended', desc: 'Extended response', pct: 20 },
    ],
  },
  'mock-national': {
    label: 'Mock National Exam',
    desc: 'High-quality examination-style paper with strong coverage and marking scheme.',
    defaultCount: 20,
    duration: '3 hours',
    sections: [
      { label: 'Section A', typeGroup: 'objective', desc: 'Objective questions', pct: 25 },
      { label: 'Section B', typeGroup: 'short-answer', desc: 'Short answer questions', pct: 20 },
      { label: 'Section C', typeGroup: 'structured', desc: 'Structured questions', pct: 35 },
      { label: 'Section D', typeGroup: 'extended', desc: 'Extended response', pct: 20 },
    ],
  },
  'competency-based': {
    label: 'Competency-Based Assessment',
    desc: 'Demonstrating competencies through real tasks and scenarios.',
    defaultCount: 8,
    duration: '2 hours',
    sections: [
      { label: 'Section A', typeGroup: 'objective', desc: 'Objective questions', pct: 20 },
      { label: 'Section B', typeGroup: 'structured', desc: 'Applied tasks and scenarios', pct: 50 },
      { label: 'Section C', typeGroup: 'extended', desc: 'Competency demonstration', pct: 30 },
    ],
  },
  formative: {
    label: 'Formative Assessment',
    desc: 'Focus on learning progress and revealing misconceptions during teaching.',
    defaultCount: 10,
    duration: '40 minutes',
    sections: [
      { label: 'Section A', typeGroup: 'objective', desc: 'Quick checks for understanding', pct: 55 },
      { label: 'Section B', typeGroup: 'short-answer', desc: 'Short answer questions', pct: 45 },
    ],
  },
  summative: {
    label: 'Summative Assessment',
    desc: 'Measure achievement after a unit or period of instruction.',
    defaultCount: 16,
    duration: '2 hours',
    sections: [
      { label: 'Section A', typeGroup: 'objective', desc: 'Objective questions', pct: 30 },
      { label: 'Section B', typeGroup: 'short-answer', desc: 'Short answer questions', pct: 30 },
      { label: 'Section C', typeGroup: 'structured', desc: 'Structured questions', pct: 40 },
    ],
  },
  practical: {
    label: 'Practical Assessment',
    desc: 'Observing and marking practical skills, procedure and reporting.',
    defaultCount: 6,
    duration: '2 hours',
    sections: [
      { label: 'Section A', typeGroup: 'short-answer', desc: 'Planning and procedure', pct: 35 },
      { label: 'Section B', typeGroup: 'structured', desc: 'Practical tasks and observation', pct: 45 },
      { label: 'Section C', typeGroup: 'extended', desc: 'Report and conclusions', pct: 20 },
    ],
  },
  revision: {
    label: 'Revision Test',
    desc: 'Consolidate and practise content already taught.',
    defaultCount: 12,
    duration: '60 minutes',
    sections: [
      { label: 'Section A', typeGroup: 'objective', desc: 'Objective questions', pct: 45 },
      { label: 'Section B', typeGroup: 'short-answer', desc: 'Short answer questions', pct: 30 },
      { label: 'Section C', typeGroup: 'structured', desc: 'Structured questions', pct: 25 },
    ],
  },
  diagnostic: {
    label: 'Diagnostic Assessment',
    desc: 'Identify what learners already know and where their misunderstandings lie.',
    defaultCount: 10,
    duration: '40 minutes',
    sections: [
      { label: 'Section A', typeGroup: 'objective', desc: 'Probing common misunderstandings', pct: 70 },
      { label: 'Section B', typeGroup: 'short-answer', desc: 'Short diagnostic questions', pct: 30 },
    ],
  },
  remedial: {
    label: 'Remedial Assessment',
    desc: 'Re-teach and check mastery of previously weak areas with focused items.',
    defaultCount: 8,
    duration: '45 minutes',
    sections: [
      { label: 'Section A', typeGroup: 'objective', desc: 'Focused objective questions', pct: 50 },
      { label: 'Section B', typeGroup: 'short-answer', desc: 'Guided short answer questions', pct: 50 },
    ],
  },
  exercise: {
    label: 'Exercise',
    desc: 'Structured practice to reinforce a lesson.',
    defaultCount: 10,
    duration: '60 minutes',
    sections: [
      { label: 'Section A', typeGroup: 'short-answer', desc: 'Practice questions', pct: 45 },
      { label: 'Section B', typeGroup: 'structured', desc: 'Application and problem solving', pct: 55 },
    ],
  },
  custom: {
    label: 'Teacher Custom',
    desc: 'Full control over types, marks, Bloom level and difficulty.',
    defaultCount: 12,
    duration: '60 minutes',
    sections: [
      { label: 'Section A', typeGroup: 'objective', desc: 'Objective questions', pct: 30 },
      { label: 'Section B', typeGroup: 'short-answer', desc: 'Short answer questions', pct: 35 },
      { label: 'Section C', typeGroup: 'structured', desc: 'Structured questions', pct: 35 },
    ],
  },
};

// --- Teacher presets (requirement 26) --------------------------------------
// Each preset is a named bundle of cognitive profile, difficulty mix and
// assessment strategy. They map to COGNITIVE_LEVELS where applicable.
const ASSESSMENT_PRESETS = {
  Basic: {
    label: 'Basic',
    desc: 'Mostly foundational knowledge and recall.',
    cognitiveLevel: 'Basic',
    difficulty: 'Easy',
    bloomNote: 'Strong recall and understanding; little abstract reasoning.',
  },
  Balanced: {
    label: 'Balanced',
    desc: 'Balanced cognitive distribution.',
    cognitiveLevel: 'Balanced',
    difficulty: 'Moderate',
    bloomNote: 'A deliberate mix of remember, understand, apply and analysis.',
  },
  Advanced: {
    label: 'Advanced',
    desc: 'More application, analysis and reasoning.',
    cognitiveLevel: 'Higher Order Thinking',
    difficulty: 'Difficult',
    bloomNote: 'Higher-order emphasis: apply, analyze, evaluate, create.',
  },
  'Exam Standard': {
    label: 'Exam Standard',
    desc: 'Professional examination-style structure and marking.',
    cognitiveLevel: 'Balanced',
    difficulty: 'Exam Standard',
    bloomNote: 'National-examination style: precise wording, layered reasoning and exact marking.',
  },
  'Competency Focused': {
    label: 'Competency Focused',
    desc: 'Strong application and performance orientation.',
    cognitiveLevel: 'Higher Order Thinking',
    difficulty: 'Moderate',
    bloomNote: 'Application-led: what the learner can DO with what they learned.',
  },
  Custom: {
    label: 'Custom',
    desc: 'Teacher controls everything.',
    cognitiveLevel: 'Custom',
    difficulty: 'Moderate',
    bloomNote: 'Use teacher-supplied cognitive, difficulty and type settings.',
  },
};

// Objective question types only (Section A style).
const OBJECTIVE_TYPES = ['multiple-choice', 'true-false', 'matching', 'fill-in-blank', 'multiple-response'];
const SHORT_ANSWER_TYPES = ['definition', 'explain', 'compare', 'differentiate', 'give-reasons', 'interpret', 'calculate'];
const STRUCTURED_TYPES = ['structured', 'problem-solving', 'case-study', 'data-interpretation'];
const EXTENDED_TYPES = ['essay'];

const ALL_QUESTION_TYPES = [
  ...OBJECTIVE_TYPES,
  ...SHORT_ANSWER_TYPES,
  ...STRUCTURED_TYPES,
  ...EXTENDED_TYPES,
];

// Subjects that prefer heavy problem solving / calculation.
const STEM_SUBJECTS = ['mathematics', 'math', 'physics', 'chemistry', 'economics', 'computer science', 'statistics'];
// Subjects that favour essays and extended writing.
const LANGUAGE_SUBJECTS = ['english', 'kinyarwanda', 'french', 'kiswahili', 'literature', 'religion', 'expressive arts', 'music'];
// Subjects that benefit from visual / data interpretation.
const VISUAL_SUBJECTS = ['geography', 'biology', 'physics', 'chemistry', 'science', 'agriculture', 'social studies', 'history', 'expressive arts'];
const GRAPH_SUBJECTS = ['geography', 'mathematics', 'math', 'economics', 'physics', 'biology', 'statistics', 'computer science'];

// --- Rwanda education context ----------------------------------------------
function classifyLevel(className) {
  const s = String(className || '').trim();
  const out = {
    className: s,
    band: 'Other',
    year: 0,
    isNursery: false,
    isPrimary: false,
    isSecondary: false,
    isUniversity: false,
    isTVET: false,
    combination: '',
  };
  if (!s) return out;
  if (/nursery|crèche|maternel|pre-?primary/i.test(s)) {
    out.band = 'Nursery';
    out.isNursery = true;
    return out;
  }
  const uni = s.match(/\b(?:year|univ|u)\s*([1-4])\b/i);
  if (uni) {
    out.band = 'University';
    out.year = parseInt(uni[1], 10);
    out.isUniversity = true;
    return out;
  }
  const prim = s.match(/\bP\s*([1-6])\b/i);
  if (prim) {
    out.band = 'Primary';
    out.year = parseInt(prim[1], 10);
    out.isPrimary = true;
    return out;
  }
  const sec = s.match(/\bS\s*([1-6])\b/i);
  if (sec) {
    out.band = 'Secondary';
    out.year = parseInt(sec[1], 10);
    out.isSecondary = true;
    if (/tv[t]\b|tvt\b|vocational|technical/i.test(s)) out.isTVET = true;
    if (/\bmeg\b/i.test(s)) out.combination = 'MEG';
    else if (/\bheg\b/i.test(s)) out.combination = 'HEG';
    else if (/\btvt\b|tvt\b|tv[t]\b/i.test(s)) out.combination = 'TVET';
    return out;
  }
  return out;
}

// Calibrate cognitive expectations and language register by level.
function levelProfile(className) {
  const lv = classifyLevel(className);
  if (lv.isNursery) {
    return {
      code: 'nursery',
      note: 'Nursery level. Use very short, concrete, picture-friendly tasks. Favour oral-style, matching, "colour/name/point to" and simple fill-in tasks. Never use multi-step reasoning or abstract wording.',
      difficultyFloor: 'Easy',
      mostlyMCQ: false,
      primary: true,
    };
  }
  if (lv.isPrimary) {
    const lower = lv.year <= 3;
    return {
      code: lower ? 'primary-lower' : 'primary-upper',
      note: lower
        ? `Primary P${lv.year}. Simple sentences, familiar daily contexts, short tasks of 1-4 marks, generous clues, no abstract theory.`
        : `Primary P${lv.year}. Straightforward recall, understanding and simple application. Tasks up to 4-6 marks. Use familiar Rwandan daily-life contexts.`,
      difficultyFloor: lower ? 'Easy' : 'Moderate',
      mostlyMCQ: true,
      primary: true,
    };
  }
  if (lv.isSecondary) {
    const upper = lv.year >= 4;
    const track = lv.combination ? ` (combination ${lv.combination}${lv.isTVET ? ', TVET' : ''})` : '';
    return {
      code: upper ? 'secondary-upper' : 'secondary-lower',
      note: upper
        ? `Secondary S${lv.year}${track}. National-examination standard. Expect genuine analysis, evaluation, problem solving and structured multi-part questions, precise examination language and exact mark allocation.`
        : `Secondary S${lv.year}${track}. School-test standard. A deliberate mix of knowledge, understanding, application and the start of analysis. Use professional but accessible examination language.`,
      difficultyFloor: upper ? 'Difficult' : 'Moderate',
      mostlyMCQ: false,
      primary: false,
    };
  }
  if (lv.isUniversity) {
    return {
      code: 'university',
      note: `University Year ${lv.year}. Advanced, discipline-level expectations. Favour essays, case studies, data interpretation, critical evaluation and open problem solving.`,
      difficultyFloor: 'Advanced',
      mostlyMCQ: false,
      primary: false,
    };
  }
  return {
    code: 'other',
    note: 'Level not clearly detected. Match the language register to the class name given.',
    difficultyFloor: 'Moderate',
    mostlyMCQ: true,
    primary: false,
  };
}

// --- Subject intelligence -----------------------------------------------------
function subjectStrategy(subject) {
  const s = String(subject || '').toLowerCase();
  if (!s) {
    return 'Focus on the genuine knowledge and skills in the document: definitions, explanations, comparisons, applications, causes and effects, interpretation and simple problems, mixed by what the content supports.';
  }
  if (/mathemat|math\b/.test(s)) {
    return 'Mathematics: calculations, algebraic reasoning, geometric reasoning, interpretation of results, multi-step problems and where appropriate short proofs or justifications. Working must be required and marks must reward correct method and correct answer.';
  }
  if (/physics/.test(s)) {
    return 'Physics: concepts, calculations, experimental interpretation, graphs, diagrams and real-world applications (e.g. household circuits, road safety, Rwanda energy projects). Marks reward method, substitution, correct units and reasoning.';
  }
  if (/chemistr/.test(s)) {
    return 'Chemistry: chemical concepts, equations and balancing, mole and stoichiometry calculations, experimental analysis, interpretation of results and industrial/lab applications. Marks reward balanced equations, calculations and explanations.';
  }
  if (/biolog/.test(s)) {
    return 'Biology: processes, labelled diagrams, classification, experiments, data interpretation and application to health, agriculture and ecology in Rwanda. Marks reward factual accuracy, labelled detail and reasoned explanation.';
  }
  if (/geograph/.test(s)) {
    return 'Geography: maps, data and graphs, physical and human geography, Rwanda and East Africa case studies, explanation and analysis. Marks reward precise location knowledge and reasoned explanation.';
  }
  if (/history/.test(s)) {
    return 'History: causes, effects, chronology, use of evidence, comparison and historical reasoning about Rwanda, Africa and the world. Marks reward factual accuracy and structured argument.';
  }
  if (/economics/.test(s)) {
    return 'Economics: concepts, data and graph interpretation, calculations (elasticity, GDP, costs), policy questions and Rwanda-specific examples. Marks reward definitions, correct calculations and justified analysis.';
  }
  if (/(computer science|ict|information|programming)/.test(s)) {
    return 'Computer Science / ICT: algorithms, problem solving, code and algorithm analysis, debugging, conceptual understanding and practical scenarios. Marks reward correct logic and correct explanation.';
  }
  if (/(english|kinyarwanda|french|kiswahili|literature)/.test(s)) {
    return 'Languages/Literature: reading comprehension, grammar, vocabulary, writing (composition), interpretation and communication skills. Use proper essay prompts with clear expectations and marking criteria.';
  }
  if (/english/.test(s)) return subjectStrategy('english');
  if (/(social studies|citizenship|religion|ethics)/.test(s)) {
    return 'Social studies / Religion & Ethics: understanding, application to citizenship, values-based reasoning and Rwandan community contexts.';
  }
  return 'Match the question style to the subject: where the content is quantitative use calculations, where it is conceptual use explanations and comparisons, and where it is practical use scenarios and case studies.';
}

// --- Distribution helpers -----------------------------------------------------
function sum(obj) {
  return Object.values(obj).reduce((a, b) => a + (Number(b) || 0), 0);
}

// Convert a categorical distribution (percentages, may not sum to 100) into a
// count of items per bucket that sums exactly to `total`.
function distributeTotal(buckets, total) {
  const keys = Object.keys(buckets).filter((k) => Number(buckets[k]) > 0);
  if (keys.length === 0) return {};
  const values = keys.map((k) => Number(buckets[k]) || 0);
  const vSum = values.reduce((a, b) => a + b, 0);
  const raw = keys.map((k, i) => ({ k, v: (values[i] / vSum) * total }));
  let assigned = raw.map((r) => Math.floor(r.v));
  let soFar = assigned.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r.v - Math.floor(r.v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let j = 0; soFar < total && j < order.length; j += 1) {
    assigned[order[j].i] += 1;
    soFar += 1;
  }
  const out = {};
  keys.forEach((k, i) => {
    if (assigned[i] > 0) out[k] = assigned[i];
  });
  return out;
}

// Place a set of labels (counts: { label: n }) roughly interleaved so that the
// same label is not repeated consecutively when possible.
function roundRobinDistribute(counts) {
  const remaining = Object.fromEntries(
    Object.entries(counts).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])
  );
  const total = Object.values(remaining).reduce((a, b) => a + b, 0) || 0;
  const result = [];
  let last = null;
  for (let placed = 0; placed < total; placed += 1) {
    const keys = Object.keys(remaining).filter((k) => remaining[k] > 0 && k !== last);
    if (!keys.length) keys.push(...Object.keys(remaining).filter((k) => remaining[k] > 0));
    // pick the label with the most remaining to keep the distribution even
    keys.sort((a, b) => remaining[b] - remaining[a]);
    const k = keys[0];
    result.push(k);
    remaining[k] -= 1;
    last = k;
  }
  return result;
}

// --- Blueprint builder ---------------------------------------------------------
// Builds a sensible, deterministic blueprint from the teacher's choices. The AI
// is asked to refine this into a final blueprint; the offline generator uses it
// directly. Never randomly assigns questions to labels afterwards — the plan is
// the contract the generated paper must follow.
function buildDefaultBlueprint({
  subject = '',
  className = '',
  count = 12,
  difficulty = 'Moderate',
  cognitiveLevel = 'Balanced',
  mode = 'class-test',
  topics = [],
  totalMarks = 0,
  questionTypes = [],
  bloomWeights = null,
  difficultyWeights = null,
  sectionMix = null,
}) {
  const lv = classifyLevel(className);
  const profile = levelProfile(className);
  const selected = normalizeTopicInput(topics);

  const modeCfg = ASSESSMENT_MODES[mode] || ASSESSMENT_MODES['class-test'];
  const n = Math.min(Math.max(parseInt(count, 10) || modeCfg.defaultCount, 3), 50);
  const subjectLower = String(subject || '').toLowerCase();
  const isStem = STEM_SUBJECTS.some((k) => subjectLower.includes(k));
  const isLang = LANGUAGE_SUBJECTS.some((k) => subjectLower.includes(k));

  // 1. Bloom distribution from cognitive level (with level floor adjustments)
  let bloom = {};
  if (cognitiveLevel === 'Custom' && bloomWeights && sum(bloomWeights) > 0) {
    bloom = { ...bloomWeights };
  } else {
    const base = COGNITIVE_PROFILES[cognitiveLevel] || COGNITIVE_PROFILES.Balanced;
    bloom = { ...base };
    if (profile.primary) {
      bloom.Evaluate = 0;
      bloom.Create = 0;
      bloom.Analyze = Math.min(bloom.Analyze || 0, lv.year >= 4 ? 10 : 5);
    } else if (lv.isNursery) {
      bloom = { Remember: 60, Understand: 25, Apply: 10, Analyze: 5, Evaluate: 0, Create: 0 };
      bloom = { Remember: 55, Understand: 25, Apply: 15, Analyze: 5, Evaluate: 0, Create: 0 };
    } else if (lv.isUniversity) {
      bloom = { Remember: 5, Understand: 15, Apply: 20, Analyze: 25, Evaluate: 20, Create: 15 };
    }
  }

  // 2. Difficulty distribution
  let diff = {};
  if (difficultyWeights && sum(difficultyWeights) > 0) {
    diff = { ...difficultyWeights };
  } else {
    diff = defaultDifficultyMix(difficulty, profile, mode);
  }

  const bloomCounts = distributeTotal(bloom, n);
  const diffCounts = distributeTotal(diff, n);

  // 3. Topic weighting
  const topicNames = selected.map((t) => t.name);
  let topicCounts = {};
  if (topicNames.length > 0) {
    topicCounts = distributeTotal(
      Object.fromEntries(topicNames.map((t) => [t, 1])),
      n
    );
  } else {
    topicCounts = { '(Whole document)': n };
  }

  // 4. Fill the question plan per topic, then per section with a type mix.
  const plan = [];
  let topicPool = Object.entries(topicCounts).map(([name, c]) => ({ name, remaining: c }));
  for (const { name, remaining } of topicPool) {
    for (let i = 0; i < remaining; i += 1) {
      const bloomKey = pickFromCounts(bloomCounts);
      const diffKey = pickFromCounts2(diffCounts, profile);
      plan.push({ topic: name, bloomLevel: bloomKey, difficulty: diffKey });
    }
  }

  // 5. Assign a question type per plan entry following the mode's section mix.
  const sections = buildSections(mode, lv, subjectLower, n, questionTypes);
  const typeForGroup = (group) => {
    const objPool = profile.primary || profile.mostlyMCQ || lv.isNursery
      ? ['multiple-choice', 'multiple-choice', 'multiple-choice', 'true-false', 'fill-in-blank']
      : ['multiple-choice', 'multiple-choice', 'true-false', 'fill-in-blank', 'matching', 'multiple-response'];
    if (group === 'objective') return objPool[Math.floor(Math.random() * objPool.length)];
    if (group === 'structured') {
      const pool = isStem
        ? ['problem-solving', 'problem-solving', 'structured', 'data-interpretation', 'case-study']
        : ['structured', 'structured', 'data-interpretation', 'case-study', 'problem-solving'];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    if (group === 'extended') return 'essay';
    const list = isStem
      ? ['explain', 'calculate', 'interpret', 'compare', 'differentiate', 'give-reasons']
      : ['explain', 'define', 'compare', 'give-reasons', 'interpret', 'differentiate'];
    return list[Math.floor(Math.random() * list.length)];
  };

  // Distribute plan entries across sections by section percentage
  const sectionAssign = [];
  for (const sec of sections) {
    const countIn = Math.round((n * sec.pct) / 100);
    for (let i = 0; i < countIn; i += 1) sectionAssign.push(sec.label);
  }
  for (let i = sectionAssign.length; i < n; i += 1) sectionAssign.push(sections[sections.length - 1].label);

  // Interleave bloom levels so the paper does not front-load recall.
  const bloomOrder = roundRobinDistribute(bloomCounts);
  const unused = plan.filter((p) => !p.used);

  const finalPlan = [];
  for (let idx = 0; idx < n; idx += 1) {
    const wanted = bloomOrder[idx];
    let entry = unused.find((p) => p.bloomLevel === wanted && !p.used);
    if (!entry) entry = unused.find((p) => !p.used);
    if (!entry) break;
    entry.used = true;
    const sec = sections.find((s) => s.label === sectionAssign[idx]) || sections[0];
    const type = questionTypes && questionTypes.length > 0
      ? questionTypes[idx % questionTypes.length]
      : typeForGroup(sec.typeGroup);
    finalPlan.push({
      section: sec.label,
      sectionLabel: sec.desc,
      type: normalizeQuestionType(type),
      topic: entry.topic,
      subtopic: '',
      bloomLevel: entry.bloomLevel,
      difficulty: entry.difficulty,
      marks: typeMarks(type, bloomKeyToWeight(entry.bloomLevel), entry.difficulty, profile),
      learningObjective: '',
    });
  }

  // Interleave topics too, so the same topic does not cluster.
  const topicOrder = roundRobinDistribute(topicCounts);
  finalPlan.forEach((p, idx) => {
    p.topic = topicOrder[idx % topicOrder.length];
  });

  // Marks: derive total from question marks unless overridden
  let marksTotal = finalPlan.reduce((a, p) => a + (p.marks || 1), 0);
  if (totalMarks > 0 && totalMarks !== marksTotal) {
    scaleMarks(finalPlan, totalMarks);
    marksTotal = totalMarks;
  }

  return {
    title: '',
    subject: subject || '',
    className: className || '',
    assessmentMode: mode,
    modeLabel: modeCfg.label,
    duration: modeCfg.duration,
    totalMarks: marksTotal,
    sections,
    topicWeights: Object.entries(topicCounts).map(([topic, c]) => ({
      topic,
      weight: Math.round((c / n) * 100),
    })),
    bloomDistribution: bloomCounts,
    difficultyDistribution: diffCounts,
    questionPlan: finalPlan,
    levelNote: profile.note,
  };
}

function pickFromCounts(counts) {
  const entries = Object.entries(counts).filter(([, c]) => c > 0);
  if (!entries.length) return 'Understand';
  return entries[Math.floor(Math.random() * entries.length)][0];
}

function pickFromCounts2(counts, profile) {
  const entries = Object.entries(counts).filter(([, c]) => c > 0);
  if (!entries.length) return 'Moderate';
  return entries[Math.floor(Math.random() * entries.length)][0];
}

function bloomKeyToWeight(level) {
  const w = { Remember: 1, Understand: 2, Apply: 3, Analyze: 4, Evaluate: 5, Create: 6 };
  return w[level] || 2;
}

// Marks by type, cognitive weight and difficulty (requirement 7).
function typeMarks(type, cognitiveWeight, difficulty, profile) {
  const base = {
    'multiple-choice': 1,
    'true-false': 1,
    matching: 1,
    'fill-in-blank': 1,
    'multiple-response': 2,
    definition: 1,
    explain: 2,
    compare: 3,
    differentiate: 3,
    'give-reasons': 3,
    interpret: 2,
    calculate: 3,
    structured: 5,
    'problem-solving': 5,
    'case-study': 6,
    'data-interpretation': 4,
    essay: 8,
  };
  const byType = base[type] || 2;
  let marks = byType + Math.round(byType * (cognitiveWeight - 2) * 0.3);
  if (['Difficult', 'Advanced', 'Exam Standard'].includes(difficulty)) marks += 1;
  if (profile.primary) marks = Math.min(marks, 4);
  return Math.max(1, marks);
}

function scaleMarks(plan, target) {
  const cur = plan.reduce((a, p) => a + (p.marks || 1), 0);
  if (cur === 0) return;
  const factor = target / cur;
  let assigned = plan.map((p) => Math.max(1, Math.round((p.marks || 1) * factor)));
  let diff = target - assigned.reduce((a, b) => a + b, 0);
  let i = 0;
  while (diff !== 0 && i < 1000) {
    for (let j = 0; j < plan.length && diff !== 0; j += 1) {
      if (i % 2 === 0 && diff > 0) {
        assigned[j] += 1;
        diff -= 1;
      } else if (i % 2 === 1 && diff < 0 && assigned[j] > 1) {
        assigned[j] -= 1;
        diff += 1;
      }
    }
    i += 1;
  }
  plan.forEach((p, idx) => {
    p.marks = assigned[idx];
  });
}

function defaultDifficultyMix(difficulty, profile, mode) {
  const dl = String(difficulty || 'Moderate').toLowerCase();
  if (profile.primary || profile.code === 'nursery') {
    return { Easy: 60, Moderate: 30, Difficult: 10 };
  }
  const mixes = {
    easy: { Easy: 55, Moderate: 35, Difficult: 10, Advanced: 0, 'Exam Standard': 0 },
    moderate: { Easy: 25, Moderate: 45, Difficult: 25, Advanced: 5, 'Exam Standard': 0 },
    difficult: { Easy: 10, Moderate: 30, Difficult: 40, Advanced: 20, 'Exam Standard': 0 },
    advanced: { Easy: 0, Moderate: 20, Difficult: 35, Advanced: 35, 'Exam Standard': 10 },
    'exam standard': { Easy: 0, Moderate: 25, Difficult: 35, Advanced: 20, 'Exam Standard': 20 },
  };
  const base = mixes[dl] || mixes.moderate;
  if (profile.isSecondary && profile.year >= 4 && dl !== 'easy') {
    return { Easy: 0, Moderate: 25, Difficult: 40, Advanced: 20, 'Exam Standard': 15 };
  }
  if (mode === 'mock-national' && dl !== 'easy') {
    return { Easy: 0, Moderate: 30, Difficult: 35, Advanced: 15, 'Exam Standard': 20 };
  }
  return base;
}

// Build the paper's section structure using the mode preset, adjusted for the
// level and, when the mode is custom, the teacher's chosen mix.
function buildSections(mode, lv, subjectLower, n, questionTypes = []) {
  const cfg = ASSESSMENT_MODES[mode] || ASSESSMENT_MODES['class-test'];
  const pct = (questionTypes && questionTypes.length ? customSectionMix(questionTypes) : cfg.sections).map((s) => ({ ...s }));
  // Primary / Nursery: keep sections simple
  if (lv.isNursery) {
    return [
      { label: 'Section A', typeGroup: 'objective', desc: 'Objective questions', pct: 70 },
      { label: 'Section B', typeGroup: 'short-answer', desc: 'Short questions', pct: 30 },
    ];
  }
  if (lv.isPrimary) {
    return [
      { label: 'Section A', typeGroup: 'objective', desc: 'Objective questions', pct: 60 },
      { label: 'Section B', typeGroup: 'short-answer', desc: 'Short answer questions', pct: 25 },
      { label: 'Section C', typeGroup: 'structured', desc: 'Simple structured questions', pct: 15 },
    ];
  }
  return pct.filter((s) => s.pct > 0).length ? pct : cfg.sections;
}

function customSectionMix(questionTypes) {
  const groups = new Map();
  for (const t of questionTypes) {
    const group = QUESTION_TYPE_CATALOG[t]?.group || 'short-answer';
    groups.set(group, (groups.get(group) || 0) + 1);
  }
  const order = ['objective', 'short-answer', 'structured', 'extended'];
  const labels = {
    objective: ['Section A', 'Objective questions'],
    'short-answer': ['Section B', 'Short answer questions'],
    structured: ['Section C', 'Structured questions'],
    extended: ['Section D', 'Extended response'],
  };
  const total = [...groups.values()].reduce((a, b) => a + b, 0) || 1;
  return order
    .filter((g) => groups.get(g) > 0)
    .map((g, i) => ({
      label: labels[g][0],
      typeGroup: g,
      desc: labels[g][1],
      pct: Math.round((groups.get(g) / total) * 100),
    }));
}

function normalizeQuestionType(t) {
  const s = String(t || '').trim().toLowerCase();
  const alias = {
    mcq: 'multiple-choice',
    'multiple choice': 'multiple-choice',
    'multi-choice': 'multiple-choice',
    'true/false': 'true-false',
    'true-false': 'true-false',
    't/f': 'true-false',
    'fill in the blank': 'fill-in-blank',
    'fill-in-the-blank': 'fill-in-blank',
    'fill blank': 'fill-in-blank',
    'short answer': 'short-answer',
    'short': 'short-answer',
    match: 'matching',
    'multiple response': 'multiple-response',
    'multi-response': 'multiple-response',
    'problem solving': 'problem-solving',
    'case study': 'case-study',
    scenario: 'case-study',
    'data interpretation': 'data-interpretation',
    'data': 'data-interpretation',
    structured: 'structured',
    essay: 'essay',
    definition: 'definition',
    explain: 'explain',
    compare: 'compare',
    differentiate: 'differentiate',
    'give reasons': 'give-reasons',
    interpret: 'interpret',
    calculate: 'calculate',
  };
  if (alias[s]) return alias[s];
  if (ALL_QUESTION_TYPES.includes(s)) return s;
  return 'short-answer';
}

function normalizeTopicInput(topics) {
  if (!Array.isArray(topics)) return [];
  const seen = new Set();
  const out = [];
  for (const t of topics) {
    if (!t) continue;
    const isObj = typeof t === 'object';
    const name = String(isObj ? t.topic || t.name : t).trim();
    if (!name) continue;
    const key = String(name).toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    const subtopics = (isObj && Array.isArray(t.subtopics) ? t.subtopics : [])
      .map((s) => String(s).trim())
      .filter((s) => s);
    out.push({ name, subtopics });
  }
  return out;
}

// --- Competency descriptors (requirement 6) --------------------------------
// Helps the engine phrase competencies and "what the learner can DO".
function competencyDescriptor(verb) {
  const map = {
    Remember: 'Recall and describe the stated facts and terms',
    Understand: 'Explain the meaning of the concept in their own words',
    Apply: 'Use the concept to solve a problem or in a new situation',
    Analyze: 'Break the content into parts, compare and explain relationships',
    Evaluate: 'Judge between options using stated criteria and evidence',
    Create: 'Design, propose or produce an original solution or response',
  };
  return map[verb] || 'Demonstrate understanding and use of the concept';
}

// --- Per-question quality scoring (requirements 23, 29) --------------------
// Deterministic, subject- and level-aware. Returns subscores out of 10 and an
// overall weighted score. Used to gate weak questions before they reach the
// final paper (applied to AI + offline questions alike).
function scoreQuestion(q, { levelProfile: profile = {}, difficulty = 'Moderate' } = {}) {
  const scores = {};
  const text = String(q.question || '').toLowerCase();
  const isObj = q.options && q.options.length >= 2;
  const isGenericTemplate = /complete the sentence|explain in your own words: "|state the key point|give a supporting detail|write four to five paragraphs|write a well/.test(text);

  // Curriculum alignment: has a mapped topic/objective and is not about the doc
  scores.alignment = 10;
  if (!q.topic) scores.alignment -= 2;
  if (!q.learningObjective) scores.alignment -= 1;
  if (/according to the notes|the document says|the author|the foreword|the table of contents|the page|the chapter (1|2|3)\b/i.test(text)) scores.alignment -= 4;

  // Academic correctness
  scores.accuracy = 10;
  if (isObj && (q.correctIndex < 0 || !q.options[q.correctIndex])) scores.accuracy -= 4;
  if (isObj && !q.explanation) scores.accuracy -= 1;
  if (!isObj && !q.modelAnswer && (!q.parts || !q.parts.length)) scores.accuracy -= 3;

  // Cognitive demand
  const bloomWeight = { Remember: 3, Understand: 5, Apply: 8, Analyze: 9, Evaluate: 10, Create: 10 };
  let cog = Math.round(((bloomWeight[q.bloomLevel] || 5) / 10) * 10);
  if (isGenericTemplate) cog = Math.min(cog, 4);
  if (/calculate|interpret|analy|compare|evaluate|design|propose|determine|explain why|suggest/.test(text)) cog = Math.min(10, cog + 1);
  if (/state the |list the |define the |what is a call|name the /.test(text) && !/why|how|explain/.test(text)) cog = Math.min(7, Math.max(3, cog - 2));
  scores.cognitiveDemand = Math.min(10, Math.max(1, cog));

  // Difficulty appropriateness
  let diff = 7;
  const d = String(q.difficulty || difficulty).toLowerCase();
  const floor = String(profile.difficultyFloor || 'Moderate').toLowerCase();
  const rank = { easy: 1, moderate: 2, difficult: 3, advanced: 4, 'exam standard': 4 };
  if (rank[d] < rank[floor]) diff -= 2;
  if (isGenericTemplate) diff -= 2;
  scores.difficultyAppropriateness = Math.min(10, Math.max(1, diff));

  // Clarity
  scores.clarity = 10;
  if (!q.question || q.question.trim().length < 12) scores.clarity -= 3;
  if (isObj && q.options.length > 0) {
    const lens = q.options.map((o) => String(o).length);
    const maxL = Math.max(...lens);
    const minL = Math.min(...lens);
    if (maxL > 0 && minL > 0 && maxL / minL > 3.2) scores.clarity -= 2;
    if (new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length) scores.clarity -= 2;
  }
  if (q.parts && q.parts.length && q.parts.some((p) => !p.question)) scores.clarity -= 2;

  // Assessment validity (does this measure the objective)
  scores.validity = 10;
  if (isGenericTemplate && !/english|kinyarwanda|french|language|literature/i.test(String(q.topic || '') + ' ' + (q.subject || ''))) scores.validity -= 3;
  if (!q.explanation && !q.markingScheme && !isObj) scores.validity -= 2;

  // Marking reliability
  scores.markingReliability = 10;
  if (!isObj && !q.markingScheme && (!q.parts || !q.parts.length)) scores.markingReliability -= 4;
  if (q.parts && q.parts.length) {
    const sumParts = q.parts.reduce((a, p) => a + (Number(p.marks) || 1), 0);
    if (Math.abs(sumParts - q.marks) <= Math.max(1, Math.round(q.marks * 0.2))) scores.markingReliability -= 0;
    else scores.markingReliability -= 2;
  }

  const weights = {
    alignment: 0.18,
    accuracy: 0.2,
    cognitiveDemand: 0.18,
    difficultyAppropriateness: 0.14,
    clarity: 0.1,
    validity: 0.1,
    markingReliability: 0.1,
  };
  let overall = 0;
  for (const k of Object.keys(weights)) overall += scores[k] * weights[k];
  overall = Math.round(overall * 10) / 10;

  return {
    scores,
    overall,
    pass: overall >= 7,
    genericTemplate: isGenericTemplate,
  };
}

module.exports = {
  BLOOM_LEVELS,
  BLOOM_DESCRIPTORS,
  COGNITIVE_LEVELS,
  COGNITIVE_PROFILES,
  DIFFICULTY_LEVELS,
  DIFFICULTY_DESCRIPTORS,
  QUESTION_TYPES: QUESTION_TYPE_CATALOG,
  OBJECTIVE_TYPES,
  SHORT_ANSWER_TYPES,
  STRUCTURED_TYPES,
  EXTENDED_TYPES,
  ALL_QUESTION_TYPES,
  ASSESSMENT_MODES,
  ASSESSMENT_PRESETS,
  STEM_SUBJECTS,
  LANGUAGE_SUBJECTS,
  VISUAL_SUBJECTS,
  GRAPH_SUBJECTS,
  classifyLevel,
  levelProfile,
  subjectStrategy,
  buildDefaultBlueprint,
  distributeTotal,
  sum,
  normalizeQuestionType,
  normalizeTopicInput,
  competencyDescriptor,
  scoreQuestion,
};