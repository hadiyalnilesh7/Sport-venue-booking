const AppError = require('../utils/AppError');

const notFoundHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

const globalErrorHandler = (error, req, res, _next) => {
  console.error('[ERROR]', {
    message: error.message,
    statusCode: error.statusCode,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  const statusCode = error.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (error.message && error.message.includes('bad auth')) {
    console.error('[ERROR] MongoDB Authentication Failed');
    console.error('[ERROR] Check MONGODB_URI credentials in environment variables');
  }

  if (req.accepts('html')) {
    res.status(statusCode).render('pages/error', {
      title: 'Something went wrong',
      error: isDevelopment ? error : { message: 'Internal server error' }
    });
    return;
  }

  res.status(statusCode).json({
    message: error.message || 'Internal server error',
    ...(isDevelopment && { details: error.toString() })
  });
};

module.exports = {
  notFoundHandler,
  globalErrorHandler
};