const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

const handleValidation = (req, _res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new AppError(errors.array().map((item) => item.msg).join(', '), 422));
  }

  next();
};

module.exports = { handleValidation };