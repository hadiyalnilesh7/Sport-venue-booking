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
  await initializeApp();
  return app(req, res);
};
