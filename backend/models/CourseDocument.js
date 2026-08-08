const mongoose = require('mongoose');

const courseDocumentSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    text: { type: String, required: true },
    wordCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CourseDocument', courseDocumentSchema);
