const User = require('../models/User');
const AppError = require('../utils/AppError');

const setFlash = (req, type, message) => {
  req.session.flash = { type, message };
};

const injectFlashMessages = (req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
};

const attachCurrentUser = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      res.locals.currentUser = null;
      next();
      return;
    }

    const user = await User.findById(req.session.userId);
    req.currentUser = user;
    res.locals.currentUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

const requireAuth = (req, _res, next) => {
  if (!req.currentUser) {
    return next(new AppError('Please login to continue.', 401));
  }

  next();
};

const requireGuest = (req, _res, next) => {
  if (req.currentUser) {
    return next(new AppError('You are already logged in.', 400));
  }

  next();
};

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.currentUser) {
    return next(new AppError('Please login to continue.', 401));
  }

  if (!roles.includes(req.currentUser.role)) {
    return next(new AppError('You do not have permission to access this page.', 403));
  }

  next();
};

module.exports = {
  setFlash,
  injectFlashMessages,
  attachCurrentUser,
  requireAuth,
  requireGuest,
  requireRole
};