const mongoose = require('mongoose');
const env = require('./env');

let cachedConnection = null;
let lastConnectionError = null;

const connectDatabase = async () => {
  try {
    // Return cached connection if already connected
    if (cachedConnection && mongoose.connection.readyState === 1) {
      return cachedConnection;
    }

    if (!env.mongodbUri) {
      throw new Error('MONGODB_URI is not configured');
    }

    console.log('[DB] Connecting to MongoDB...');

    const connection = await mongoose.connect(env.mongodbUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 45000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true
    });

    cachedConnection = connection;
    lastConnectionError = null;
    console.log('[DB] Connected successfully');
    
    return connection;
  } catch (error) {
    lastConnectionError = error;
    console.error('[DB] Connection failed:', error.message);
    
    // Don't throw - let caller handle it
    throw error;
  }
};

module.exports = { 
  connectDatabase,
  getConnectionStatus: () => ({
    connected: mongoose.connection.readyState === 1,
    state: mongoose.connection.readyState,
    lastError: lastConnectionError?.message
  })
};