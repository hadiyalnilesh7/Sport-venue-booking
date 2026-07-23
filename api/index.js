/**
 * Vercel Serverless Handler
 * Sports Venue Booking Platform
 */

const mongoose = require('mongoose');

// Keep a reference to the app and database connection
let app = null;
let dbConnected = false;

/**
 * Initialize the application (lazy loading)
 */
const initializeApp = async () => {
  // If app already initialized, return it
  if (app) {
    return app;
  }

  try {
    console.log('[Init] Loading application...');
    
    // Require the Express app
    app = require('../src/app');
    console.log('[Init] Express app loaded');

    // Require database config
    const { connectDatabase } = require('../src/config/db');

    // Connect to database if not already connected
    if (!dbConnected) {
      console.log('[Init] Connecting to MongoDB...');
      await connectDatabase();
      dbConnected = true;
      console.log('[Init] MongoDB connected');
    }

    console.log('[Init] Application ready');
    return app;
  } catch (error) {
    console.error('[Init] Initialization failed:', error.message);
    throw error;
  }
};

/**
 * Main serverless handler
 */
module.exports = async (req, res) => {
  try {
    // Initialize app on first request
    const application = await initializeApp();

    // Invoke the Express app with the request and response
    application(req, res);
  } catch (error) {
    console.error('[Handler] Error:', error.message);

    // Send error response
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        error: 'Internal Server Error'
      }));
    }
  }
};


