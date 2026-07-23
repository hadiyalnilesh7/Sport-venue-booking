/**
 * Vercel Serverless Function Handler
 * Handles all HTTP requests for the Sports Venue Booking Platform
 */

const app = require('../src/app');
const { connectDatabase } = require('../src/config/db');
const mongoose = require('mongoose');

let connectionInitiated = false;

/**
 * Async handler wrapper that catches all errors
 */
module.exports = async (req, res) => {
  try {
    // Initialize database connection on first request
    if (!connectionInitiated) {
      connectionInitiated = true;
      
      // Only connect if not already connected
      if (mongoose.connection.readyState !== 1) {
        console.log('[Handler] Connecting to database...');
        await connectDatabase();
        console.log('[Handler] Database connected');
      }
    }

    // Pass request to Express app
    // Express will handle the request/response cycle
    app(req, res);
  } catch (error) {
    // Log the error for debugging
    console.error('[Handler] Error:', {
      message: error?.message || 'Unknown error',
      type: error?.constructor?.name,
      statusCode: error?.statusCode
    });

    // Only send response if headers not already sent
    if (!res.headersSent) {
      res.statusCode = error?.statusCode || 500;
      res.setHeader('Content-Type', 'application/json');
      
      res.end(JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' 
          ? error?.message 
          : 'An error occurred processing your request'
      }));
    }
  }
};

