const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) return res.status(401).json({ message: 'User not found' });
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && ['admin', 'leader'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

const staffOnly = (req, res, next) => {
  if (req.user && ['admin', 'teacher', 'leader'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Staff access required' });
  }
};

const teacherOnly = (req, res, next) => {
  if (req.user && req.user.role === 'teacher') {
    next();
  } else {
    res.status(403).json({ message: 'Teacher access required' });
  }
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  username: user.username,
  title: user.title || '',
  role: user.role,
  assignedClass: user.assignedClass || '',
  courses: user.courses || [],
  active: user.active,
});

module.exports = { protect, adminOnly, staffOnly, teacherOnly, publicUser };
