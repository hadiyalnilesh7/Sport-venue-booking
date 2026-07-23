const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.warn('[ENV] Warning: MONGODB_URI not set. Using local development URI.');
}

if (process.env.NODE_ENV === 'production' && !mongoUri) {
  throw new Error(
    'MONGODB_URI is required in production.\n' +
    'Please set it in Vercel Environment Variables:\n' +
    'mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true'
  );
}

if (process.env.NODE_ENV === 'production' && process.env.SESSION_SECRET === 'replace-with-a-long-random-secret') {
  throw new Error('SESSION_SECRET must be changed from default in production.');
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  appName: process.env.APP_NAME || 'Sports Venue Booking Platform',
  appUrl: process.env.APP_URL || 'http://localhost:5000',
  mongodbUri: mongoUri || 'mongodb://127.0.0.1:27017/sports-venue-booking-platform',
  sessionSecret: process.env.SESSION_SECRET || 'development-secret-change-in-production',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFromName: process.env.SMTP_FROM_NAME || 'Sports Venue Booking Platform',
  smtpFromEmail: process.env.SMTP_FROM_EMAIL || 'no-reply@example.com',
  bookingAdvancePercent: Number(process.env.BOOKING_ADVANCE_PERCENT) || 25
};