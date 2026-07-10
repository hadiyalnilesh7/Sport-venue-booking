const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  appName: process.env.APP_NAME || 'Sports Venue Booking Platform',
  appUrl: process.env.APP_URL || 'http://localhost:5000',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sports-venue-booking-platform',
  sessionSecret: process.env.SESSION_SECRET || 'development-secret',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFromName: process.env.SMTP_FROM_NAME || 'Sports Venue Booking Platform',
  smtpFromEmail: process.env.SMTP_FROM_EMAIL || 'no-reply@example.com',
  bookingAdvancePercent: Number(process.env.BOOKING_ADVANCE_PERCENT) || 25
};