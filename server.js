const app = require('./src/app');
const { connectDatabase } = require('./src/config/db');
const env = require('./src/config/env');

const startServer = async () => {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`${env.appName} running on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});