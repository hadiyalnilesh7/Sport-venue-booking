const app = require('../src/app');
const { connectDatabase } = require('../src/config/db');

let isConnecting = false;
let connectionError = null;

const initializeApp = async () => {
  if (isConnecting) {
    if (connectionError) {
      throw connectionError;
    }
    return;
  }

  try {
    isConnecting = true;
    connectionError = null;
    
    console.log('[API] Initializing app...');
    await connectDatabase();
    console.log('[API] App initialized successfully');
  } catch (error) {
    isConnecting = false;
    connectionError = error;
    console.error('[API] Initialization error:', error.message || error);
    throw error;
  } finally {
    isConnecting = false;
  }
};

module.exports = async (req, res) => {
  try {
    console.log(`[API] ${req.method} ${req.url}`);
    
    await initializeApp();
    
    return app(req, res);
  } catch (error) {
    console.error('[API] Request handler error:', error.message || error);
    console.error('[API] Stack:', error.stack);
    
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      
      const errorResponse = {
        error: 'Internal Server Error',
        message: error.message || 'Unknown error occurred',
        status: 500
      };
      
      if (process.env.NODE_ENV !== 'production') {
        errorResponse.details = error.toString();
      }
      
      res.end(JSON.stringify(errorResponse));
    }
  }
};
