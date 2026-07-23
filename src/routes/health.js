/**
 * Health Check Endpoint
 * Test basic server connectivity
 */

const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

router.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'Sports Venue Booking Platform',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
