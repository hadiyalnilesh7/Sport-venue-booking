const app = require('../src/app');
const { connectDatabase } = require('../src/config/db');

let isDatabaseConnected = false;

const initializeApp = async () => {
  if (!isDatabaseConnected) {
    try {
      await connectDatabase();
      isDatabaseConnected = true;
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error.message);
      isDatabaseConnected = false;
      throw error;
    }
  }
};

module.exports = async (req, res) => {
  try {
    await initializeApp();
    // Use the Express app to handle the request
    return app(req, res);
  } catch (error) {
    console.error('Server initialization failed:', error.message || error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Internal Server Error: ' + (error.message || 'Unknown error'));
  }
};
