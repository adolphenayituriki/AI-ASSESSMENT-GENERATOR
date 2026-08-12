require('dotenv').config();
const path = require('path');
const fs = require('fs');
const dns = require('dns');

// Some routers/VPNs/ISPs on Windows refuse SRV DNS queries (mongodb+srv://),
// which breaks the MongoDB Atlas driver's cluster discovery even though the
// site works in a browser. Route Node's resolver through public DNS instead.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  console.warn('Could not override DNS servers:', err.message);
}

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const seedData = require('./seed/seed');

const app = express();

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'ai-assessment-tool-secret-change-in-production';
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(compression());

// Serve the built React app in production (frontend/dist)
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');

app.get('/', (req, res) => {
  if (fs.existsSync(frontendDist)) {
    res.set('Cache-Control', 'no-store');
    return res.sendFile(path.join(frontendDist, 'index.html'));
  }
  res.json({
    name: 'DuFast EduAi API',
    message: 'DuFast EduAi backend is running (run the frontend build to see the app)',
    docs: '/api/health',
  });
});

app.get('/api/health', (req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState];
  res.json({
    status: 'ok',
    database: dbState,
    time: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/assessments', require('./routes/assessmentRoutes'));

// Serve static frontend assets and SPA fallback (skip /api).
// Hashed build files under /assets are content-addressed, so they can be cached
// for a year (immutable); index.html is served fresh on every request.
if (fs.existsSync(frontendDist)) {
  app.use(
    '/assets',
    express.static(path.join(frontendDist, 'assets'), {
      maxAge: '365d',
      immutable: true,
    })
  );
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handling for multer and others
app.use((err, req, res, next) => {
  if (err && err.message) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`\n========================================`);
  console.log(`  AI ASSESSMENT TOOL API`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`========================================\n`);

  const connected = await connectDB();
  if (connected) {
    await seedData();
    console.log('Backend fully ready with database.');
  } else {
    console.warn(
      'Server is running WITHOUT a database connection. API data endpoints will fail until you set a valid MONGODB_URI in backend/.env'
    );
  }
});

module.exports = app;
