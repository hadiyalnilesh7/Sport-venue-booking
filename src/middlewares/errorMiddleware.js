const AppError = require('../utils/AppError');

const notFoundHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

const globalErrorHandler = (error, req, res, _next) => {
  const statusCode = error.statusCode || 500;

  if (req.accepts('html')) {
    res.status(statusCode).render('pages/error', {
      title: 'Something went wrong',
      error
    });
    return;
  }

  res.status(statusCode).json({
    message: error.message || 'Internal server error'
  });
};

module.exports = {
  notFoundHandler,
  globalErrorHandler
};