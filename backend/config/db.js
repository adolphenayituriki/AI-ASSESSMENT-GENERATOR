const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dufast_eduai';
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.error('\n=== MONGODB CONNECTION ERROR ===');
    console.error('Could not connect to MongoDB.');
    console.error('If you are using a placeholder connection string, replace MONGODB_URI in backend/.env with your real MongoDB connection string.');
    console.error(`Error details: ${err.message}\n`);
    return false;
  }
};

module.exports = connectDB;
