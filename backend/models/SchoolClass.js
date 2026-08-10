const mongoose = require('mongoose');

const schoolClassSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    level: { type: String, enum: ['Nursery', 'Primary', 'Secondary', 'University'], required: true },
    combination: { type: String, default: '' },
    studentsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SchoolClass', schoolClassSchema);
