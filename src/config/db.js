const mongoose = require('mongoose');
const env = require('./env');

let connection = null;

const connectDatabase = async () => {
  try {
    // Return existing connection if already connected
    if (connection && mongoose.connection.readyState === 1) {
      console.log('[DB] Using existing connection');
      return connection;
    }

    if (!env.mongodbUri) {
      throw new Error('MONGODB_URI environment variable not set');
    }

    console.log('[DB] Establishing connection...');

    // Connect to MongoDB
    connection = await mongoose.connect(env.mongodbUri, {
      maxPoolSize: 5,
      minPoolSize: 1,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
      retryWrites: true
    });

    console.log('[DB] Connected successfully');
    return connection;
  } catch (error) {
    console.error('[DB] Connection error:', error.message);
    connection = null;
    throw error;
  }
};

module.exports = { connectDatabase };
