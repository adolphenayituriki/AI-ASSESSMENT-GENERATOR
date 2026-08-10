const express = require('express');
const router = express.Router();
const { protect, staffOnly } = require('../middleware/auth');
const SchoolClass = require('../models/SchoolClass');

// Every class in the school, for all staff roles (teacher, leader, admin).
router.get('/classes', protect, staffOnly, async (req, res) => {
  try {
    const classes = await SchoolClass.find().sort({ name: 1 });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
