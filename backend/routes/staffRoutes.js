const express = require('express');
const router = express.Router();
const { protect, staffOnly } = require('../middleware/auth');
const SchoolClass = require('../models/SchoolClass');

const teacherClassNames = (user) => {
  const names = new Set();
  if (user.assignedClass) names.add(user.assignedClass);
  (user.courses || []).forEach((c) => {
    if (c.className) names.add(c.className);
  });
  return [...names];
};

// Classes available to the signed-in user (all classes for leader/admin)
router.get('/classes', protect, staffOnly, async (req, res) => {
  try {
    let query = SchoolClass.find().sort({ name: 1 });
    if (req.user.role === 'teacher') {
      const names = teacherClassNames(req.user);
      query = query.where('name').in(names);
    }
    const classes = await query;
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
