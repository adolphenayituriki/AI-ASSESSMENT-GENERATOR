const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, publicUser } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password is required' });

    const user = await User.findOne(
      username ? { username } : { email }
    );

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.active === false) {
      return res.status(401).json({ message: 'This account is disabled. Contact the administrator.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      token,
      user: publicUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();

    const existing = await User.findOne({ $or: [{ username: cleanUsername }, { email: cleanEmail }] });
    if (existing) {
      return res.status(400).json({
        message: existing.email === cleanEmail ? 'An account with this email already exists' : 'This username is already taken',
      });
    }

    const user = await User.create({
      name: String(name).trim(),
      username: cleanUsername,
      email: cleanEmail,
      password,
      role: 'teacher',
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username or email is already registered' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    if (!(await req.user.matchPassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    req.user.password = newPassword;
    await req.user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
