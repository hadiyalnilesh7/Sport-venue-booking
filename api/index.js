const app = require('../src/app');
const { connectDatabase } = require('../src/config/db');

let isDatabaseConnected = false;

const initializeApp = async () => {
  if (!isDatabaseConnected) {
    await connectDatabase();
    isDatabaseConnected = true;
  }
};

module.exports = async (req, res) => {
  try {
    await initializeApp();
    return app(req, res);
  } catch (error) {
    console.error('Server initialization failed:', error.message || error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    return res.end('Internal Server Error');
  }
};
