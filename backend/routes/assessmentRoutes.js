const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, staffOnly } = require('../middleware/auth');
const CourseDocument = require('../models/CourseDocument');
const Assessment = require('../models/Assessment');
const { extractText, generateAssessment, generateTopics } = require('../utils/ai');
const { buildAssessmentPdf } = require('../utils/pdf');

const ALLOWED_EXT = ['pdf', 'docx', 'txt'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = (file.originalname || '').split('.').pop().toLowerCase();
    if (ALLOWED_EXT.includes(ext)) return cb(null, true);
    cb(new Error('Only PDF, DOCX or TXT documents are supported'));
  },
});

const ownerId = (assessment) => String(assessment?.teacher?._id || assessment?.teacher || '');
const canView = (user, assessment) =>
  user.role === 'leader' || user.role === 'admin' || ownerId(assessment) === String(user._id);

// Upload a course document and extract its text (staff only)
router.post('/upload', protect, staffOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const text = (await extractText(req.file)).slice(0, 1500000);
    if (!text || text.length < 50) {
      return res
        .status(400)
        .json({ message: 'Could not extract enough text from the document. Use a text-based PDF, DOCX or TXT file.' });
    }

    const doc = await CourseDocument.create({
      teacher: req.user._id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      text,
      wordCount: text.split(/\s+/).length,
    });

    res.status(201).json({ document: { id: doc._id, originalName: doc.originalName, wordCount: doc.wordCount } });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Upload failed' });
  }
});

// Generate an assessment from a previously uploaded document (staff only)
router.post('/generate', protect, staffOnly, async (req, res) => {
  try {
    const { documentId, type = 'quiz', count = 10, subject = '', className = '', title = '', difficulty = '', topics = [] } = req.body;
    if (!documentId) return res.status(400).json({ message: 'documentId is required' });

    const doc = await CourseDocument.findOne({ _id: documentId, teacher: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const n = Math.min(Math.max(parseInt(count, 10) || 10, 3), 30);
    const result = await generateAssessment({
      text: doc.text,
      type,
      count: n,
      subject,
      className,
      title,
      difficulty,
      topics: Array.isArray(topics) ? topics.filter((t) => String(t).trim()) : [],
    });

    res.json({ title: result.title, source: result.source, questions: result.questions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// List the topics/chapters detected in a document (staff only)
router.post('/topics', protect, staffOnly, async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ message: 'documentId is required' });

    const doc = await CourseDocument.findOne({ _id: documentId, teacher: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const topics = await generateTopics(doc.text);
    res.json({ topics });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save an assessment to the teacher's library (staff only)
router.post('/', protect, staffOnly, async (req, res) => {
  try {
    const {
      documentId,
      title,
      type = 'quiz',
      subject = '',
      className = '',
      source = 'gemini',
      questions = [],
      difficulty = '',
      timeAllowed = '',
      extraInstructions = '',
    } = req.body;
    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'title and questions are required' });
    }

    const totalMarks = questions.reduce((sum, q) => sum + (Math.max(1, Number(q.marks) || 1)), 0);

    const assessment = await Assessment.create({
      teacher: req.user._id,
      document: documentId || null,
      title,
      type,
      subject,
      className,
      source: ['gemini', 'openai', 'fallback'].includes(source) ? source : 'fallback',
      difficulty: difficulty || '',
      marks: Number(totalMarks) || 0,
      timeAllowed: timeAllowed || '',
      extraInstructions: extraInstructions || '',
      questions: questions.map((q) => ({
        question: q.question,
        marks: Math.max(1, Number(q.marks) || 1),
        options: q.options || [],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : -1,
        answer: q.answer || '',
        explanation: q.explanation || '',
      })),
    });

    res.status(201).json(assessment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// List assessments (teacher sees their own; leader/admin see all)
router.get('/', protect, staffOnly, async (req, res) => {
  try {
    const query = {};
    if (!['leader', 'admin'].includes(req.user.role)) query.teacher = req.user._id;
    if (req.query.type) query.type = req.query.type;

    const list = await Assessment.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .select('-questions');
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PDF download of an assessment (saved item or preview payload)
router.post('/pdf', protect, staffOnly, async (req, res) => {
  try {
    const {
      title,
      type = 'quiz',
      subject = '',
      className = '',
      questions = [],
      markingGuide = false,
      timeAllowed = '',
      extraInstructions = '',
    } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'questions are required' });
    }

    const buffer = await buildAssessmentPdf({
      title: title || 'Assessment',
      type,
      subject,
      className,
      questions,
      markingGuide: !!markingGuide,
      timeAllowed: timeAllowed || '',
      extraInstructions: extraInstructions || '',
    });
    const base = (title || 'assessment').replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').toLowerCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${base || 'assessment'}${markingGuide ? '-marking-guide' : ''}.pdf"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Assessment detail with questions
router.get('/:id', protect, staffOnly, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id).populate('teacher', 'name');
    if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
    if (!canView(req.user, assessment)) return res.status(403).json({ message: 'You do not have access to this assessment' });
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete an assessment
router.delete('/:id', protect, staffOnly, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
    if (!canView(req.user, assessment)) return res.status(403).json({ message: 'You do not have access to this assessment' });
    await assessment.deleteOne();
    res.json({ message: 'Assessment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
