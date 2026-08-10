const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminStrict } = require('../middleware/auth');

const ROLES = ['admin', 'teacher', 'leader'];

const sanitize = (u) => ({
  id: u._id,
  name: u.name,
  username: u.username,
  email: u.email,
  title: u.title || '',
  role: u.role,
  assignedClass: u.assignedClass || '',
  courses: u.courses || [],
  active: u.active,
  createdAt: u.createdAt,
});

const findOrError = async (res, id) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return null;
    }
    return user;
  } catch (e) {
    res.status(400).json({ message: 'Invalid user id' });
    return null;
  }
};

const countAdmins = async () => User.countDocuments({ role: 'admin', active: true });

// List all users
router.get('/', protect, adminStrict, async (req, res) => {
  try {
    const users = await User.find().sort({ role: 1, name: 1 });
    res.json(users.map(sanitize));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a user
router.post('/', protect, adminStrict, async (req, res) => {
  try {
    const { name, username, email, password, role = 'teacher', title = '', assignedClass = '', active = true } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'Name, username, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
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
      role,
      title: String(title || '').trim(),
      assignedClass: String(assignedClass || '').trim(),
      active,
    });

    res.status(201).json({ message: 'User created successfully', user: sanitize(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username or email is already registered' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a user
router.patch('/:id', protect, adminStrict, async (req, res) => {
  try {
    const target = await findOrError(res, req.params.id);
    if (!target) return;

    const { name, username, email, role, title, assignedClass, active, password } = req.body;

    if (target._id.equals(req.user._id)) {
      if (role && role !== 'admin') {
        return res.status(400).json({ message: 'You cannot remove your own admin role' });
      }
      if (active === false) {
        return res.status(400).json({ message: 'You cannot disable your own account' });
      }
    }

    if (target.role === 'admin' && role && role !== 'admin') {
      const admins = await countAdmins();
      if (admins <= 1) {
        return res.status(400).json({ message: 'At least one active administrator must remain' });
      }
    }

    if (username) {
      const cleanUsername = String(username).trim().toLowerCase();
      const dup = await User.findOne({ username: cleanUsername, _id: { $ne: target._id } });
      if (dup) return res.status(400).json({ message: 'This username is already taken' });
      target.username = cleanUsername;
    }
    if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      const dup = await User.findOne({ email: cleanEmail, _id: { $ne: target._id } });
      if (dup) return res.status(400).json({ message: 'An account with this email already exists' });
      target.email = cleanEmail;
    }
    if (name) target.name = String(name).trim();
    if (role) {
      if (!ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });
      target.role = role;
    }
    if (title !== undefined) target.title = String(title || '').trim();
    if (assignedClass !== undefined) target.assignedClass = String(assignedClass || '').trim();
    if (active !== undefined) target.active = Boolean(active);
    if (password) {
      if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
      target.password = password;
    }

    await target.save();
    res.json({ message: 'User updated successfully', user: sanitize(target) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username or email is already registered' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a user
router.delete('/:id', protect, adminStrict, async (req, res) => {
  try {
    const target = await findOrError(res, req.params.id);
    if (!target) return;

    if (target._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    if (target.role === 'admin') {
      const admins = await countAdmins();
      if (admins <= 1) {
        return res.status(400).json({ message: 'At least one active administrator must remain' });
      }
    }

    await target.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
