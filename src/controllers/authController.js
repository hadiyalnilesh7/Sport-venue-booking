const { body } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { ROLES } = require('../constants/roles');
const { setFlash } = require('../middlewares/authMiddleware');
const { sendMail } = require('../config/mailer');
const env = require('../config/env');

const registerValidators = [
  body('fullName').trim().notEmpty().withMessage('Full name is required.'),
  body('email').isEmail().withMessage('Enter a valid email address.'),
  body('phone').trim().notEmpty().withMessage('Phone number is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  body('role').isIn([ROLES.USER, ROLES.OWNER]).withMessage('Invalid role selected.'),
  body('upiId').custom((value, { req }) => {
    if (req.body.role === ROLES.OWNER && !String(value || '').trim()) {
      throw new Error('UPI ID is required for venue owners.');
    }

    return true;
  })
];

const loginValidators = [
  body('email').isEmail().withMessage('Enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.')
];

const forgotPasswordValidators = [
  body('email').isEmail().withMessage('Enter a valid email address.')
];

const resetPasswordValidators = [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Confirm password must match new password.');
    }

    return true;
  })
];

const showRegister = (_req, res) => {
  res.render('pages/auth/register', { title: 'Create account' });
};

const showLogin = (_req, res) => {
  res.render('pages/auth/login', { title: 'Login' });
};

const showForgotPassword = (_req, res) => {
  res.render('pages/auth/forgot-password', { title: 'Forgot Password' });
};

const showResetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() }
  });

  if (!user) {
    throw new AppError('This reset link is invalid or expired. Please request a new one.', 400);
  }

  res.render('pages/auth/reset-password', {
    title: 'Reset Password',
    token: req.params.token
  });
});

const register = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, role, accountHolderName, upiId } = req.body;
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw new AppError('Email already exists. Please login instead.', 409);
  }

  const user = await User.create({
    fullName,
    email,
    phone,
    password,
    role,
    paymentDetails:
      role === ROLES.OWNER
        ? {
            accountHolderName,
            upiId,
            qrCodeImage: req.file ? `/uploads/${req.file.filename}` : ''
          }
        : undefined,
    isApproved: role === ROLES.OWNER ? false : true
  });

  req.session.userId = user._id.toString();
  setFlash(
    req,
    'success',
    role === ROLES.OWNER ? 'Owner account created. Admin approval is required before publishing venues.' : 'Account created successfully.'
  );

  res.redirect('/dashboard');
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  req.session.userId = user._id.toString();
  setFlash(req, 'success', 'Login successful.');
  res.redirect('/dashboard');
});

const forgotPassword = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const user = await User.findOne({ email });

  const smtpNotConfigured = !env.smtpHost || !env.smtpUser || !env.smtpPass || env.smtpPass === 'your-gmail-app-password';
  if (smtpNotConfigured) {
    setFlash(req, 'error', 'Forgot password email is not configured yet. Please set a valid Gmail App Password in SMTP_PASS.');
    res.redirect('/auth/forgot-password');
    return;
  }

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetLink = `${env.appUrl}/auth/reset-password/${rawToken}`;
    const html = `
      <h2>Password Reset Request</h2>
      <p>Hello ${user.fullName},</p>
      <p>Click the button below to reset your password. This link is valid for 15 minutes.</p>
      <p style="margin: 20px 0;">
        <a href="${resetLink}" style="background:#4F46E5;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block;">Reset Password</a>
      </p>
      <p>If you did not request this, you can ignore this email.</p>
    `;

    try {
      await sendMail({
        to: user.email,
        subject: 'Reset your Sports Venue Booking password',
        html
      });
    } catch (_error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      setFlash(req, 'error', 'Unable to send reset email. Please verify SMTP settings and Gmail App Password.');
      res.redirect('/auth/forgot-password');
      return;
    }
  }

  setFlash(req, 'success', 'If your email is registered, a password reset link has been sent.');
  res.redirect('/auth/login');
});

const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() }
  }).select('+password');

  if (!user) {
    throw new AppError('This reset link is invalid or expired. Please request a new one.', 400);
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  setFlash(req, 'success', 'Password reset successful. Please login with your new password.');
  res.redirect('/auth/login');
});

const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};

module.exports = {
  registerValidators,
  loginValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  showRegister,
  showLogin,
  showForgotPassword,
  showResetPassword,
  register,
  login,
  forgotPassword,
  resetPassword,
  logout
};