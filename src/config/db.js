const mongoose = require('mongoose');
const env = require('./env');

let cachedConnection = null;
let connectionAttempts = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const connectDatabase = async () => {
  // Return cached connection if it exists and is connected
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('[DB] Using cached MongoDB connection');
    return cachedConnection;
  }

  // Skip if already attempting to connect
  if (connectionAttempts > 0) {
    console.log(`[DB] Connection attempt in progress (${connectionAttempts}/${MAX_RETRIES})`);
    await delay(500);
    return connectDatabase();
  }

  connectionAttempts++;
  
  try {
    console.log('[DB] Attempting MongoDB connection...');
    console.log(`[DB] URI Host: ${env.mongodbUri.split('@')[1]?.split('/')[0] || 'unknown'}`);
    
    if (!env.mongodbUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    const connection = await mongoose.connect(env.mongodbUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 45000,
      retryWrites: true,
      retryReads: true,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      family: 4,
      authSource: 'admin',
      authMechanism: 'SCRAM-SHA-1'
    });
    
    cachedConnection = connection;
    connectionAttempts = 0;
    console.log('[DB] MongoDB connected successfully');
    return connection;
  } catch (error) {
    connectionAttempts--;
    
    const errorMsg = error.message || String(error);
    console.error(`[DB] Connection error: ${errorMsg}`);
    
    if (errorMsg.includes('bad auth')) {
      console.error('[DB] Authentication failed. Check MongoDB credentials in environment variables.');
      console.error('[DB] Verify username/password and that the user has database access.');
    } else if (errorMsg.includes('ENOTFOUND')) {
      console.error('[DB] Cannot resolve MongoDB host. Check MONGODB_URI format.');
    } else if (errorMsg.includes('ECONNREFUSED')) {
      console.error('[DB] Connection refused. MongoDB server may be offline.');
    }
    
    cachedConnection = null;
    
    if (connectionAttempts < MAX_RETRIES) {
      console.log(`[DB] Retrying connection (${connectionAttempts}/${MAX_RETRIES}) in ${RETRY_DELAY}ms...`);
      await delay(RETRY_DELAY);
      return connectDatabase();
    }
    
    throw error;
  }
};

module.exports = { connectDatabase };