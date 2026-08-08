const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    marks: { type: Number, default: 1 },
    options: { type: [String], default: [] },
    correctIndex: { type: Number, default: -1 },
    answer: { type: String, default: '' },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const assessmentSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseDocument', default: null },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['quiz', 'exam', 'exercise', 'homework'],
      default: 'quiz',
    },
    subject: { type: String, default: '', trim: true },
    className: { type: String, default: '', trim: true },
    source: { type: String, enum: ['gemini', 'openai', 'fallback'], default: 'gemini' },
    difficulty: { type: String, default: '', trim: true },
    marks: { type: Number, default: 0, min: 0 },
    timeAllowed: { type: String, default: '', trim: true },
    extraInstructions: { type: String, default: '', trim: true },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true }
);

assessmentSchema.index({ teacher: 1, createdAt: -1 });

module.exports = mongoose.model('Assessment', assessmentSchema);
