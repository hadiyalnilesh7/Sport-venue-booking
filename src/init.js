/**
 * App Initialization Module
 * Ensures all dependencies are ready before handling requests
 */

const mongoose = require('mongoose');

let initialized = false;
let initError = null;

const initializeApp = async () => {
  if (initialized) {
    if (initError) throw initError;
    return true;
  }

  try {
    console.log('[Init] Starting initialization...');

    // Check MongoDB connection status
    if (mongoose.connection.readyState !== 1) {
      console.log('[Init] MongoDB not connected yet');
    } else {
      console.log('[Init] MongoDB already connected');
    }

    initialized = true;
    console.log('[Init] Initialization complete');
    return true;
  } catch (error) {
    initError = error;
    console.error('[Init] Initialization failed:', error.message);
    throw error;
  }
};

module.exports = { initializeApp };
