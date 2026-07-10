const { body } = require('express-validator');
const { isBefore, subHours } = require('date-fns');
const Booking = require('../models/Booking');
const Venue = require('../models/Venue');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  createBooking,
  cancelBooking,
  verifyBookingPayment,
  rejectBookingPayment,
  resubmitRejectedBookingPayment,
  confirmRemainingPaymentReceived,
  syncBookingLifecycleStatus,
  syncBookingsLifecycleStatuses
} = require('../services/bookingService');
const { formatDate, normalizeDate } = require('../utils/time');

const bookingValidators = [
  body('sportType').trim().notEmpty().withMessage('Sport type is required.'),
  body('bookingDate').isISO8601().withMessage('A valid booking date is required.'),
  body('slotStartTime').trim().notEmpty().withMessage('Please choose a slot.'),
  body('couponCode').optional({ values: 'falsy' }).trim(),
  body('paymentReference').trim().notEmpty().withMessage('Payment transaction ID or UPI reference is required.')
];

const reuploadPaymentValidators = [
  body('paymentReference').trim().notEmpty().withMessage('Payment reference is required for re-upload.'),
  body('resubmitNote').optional({ values: 'falsy' }).trim()
];

const create = asyncHandler(async (req, res) => {
  const venue = await Venue.findOne({ slug: req.params.slug }).populate('owner');

  if (!venue || !venue.isApproved) {
    throw new AppError('Venue not available for booking.', 404);
  }

  const booking = await createBooking({
    user: req.currentUser,
    venue,
    sportType: req.body.sportType,
    bookingDate: req.body.bookingDate,
    slotStartTime: req.body.slotStartTime,
    couponCode: req.body.couponCode,
    paymentReference: req.body.paymentReference,
    paymentScreenshot: req.file ? `/uploads/${req.file.filename}` : ''
  });

  res.redirect(`/dashboard/bookings/${booking._id}`);
});

const userBookings = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const query = { user: req.currentUser._id };
  if (from || to) {
    query.bookingDate = {};
    if (from) query.bookingDate.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query.bookingDate.$lte = toDate;
    }
  }
  const bookings = await Booking.find(query).populate('venue').sort({ createdAt: -1 });
  await syncBookingsLifecycleStatuses(bookings);
  res.render('pages/dashboard/user-bookings', {
    title: 'My Bookings',
    bookings,
    formatDate,
    from: from || '',
    to: to || ''
  });
});

const bookingDetails = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.currentUser._id }).populate('venue owner');

  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }

  await syncBookingLifecycleStatus(booking);

  res.render('pages/dashboard/booking-details', {
    title: 'Booking Details',
    booking,
    formatDate
  });
});

const cancel = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.currentUser._id })
    .populate('venue')
    .populate('owner')
    .populate('user');

  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }

  const bookingDateTime = normalizeDate(booking.bookingDate);
  if (isBefore(bookingDateTime, subHours(new Date(), 0))) {
    throw new AppError('Past bookings cannot be cancelled.', 400);
  }

  await cancelBooking({
    booking,
    cancelledBy: 'user',
    reason: req.body.reason || 'Cancelled by user'
  });

  res.redirect('/dashboard/bookings');
});

const verifyPayment = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, owner: req.currentUser._id })
    .populate('venue')
    .populate('owner')
    .populate('user');

  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }

  await verifyBookingPayment({
    booking,
    verificationNote: req.body.verificationNote || 'Advance payment verified by owner.',
    actor: 'owner'
  });

  res.redirect('/owner/bookings');
});

const rejectPayment = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, owner: req.currentUser._id })
    .populate('venue')
    .populate('owner')
    .populate('user');

  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }

  await rejectBookingPayment({
    booking,
    rejectionReason: req.body.rejectionReason || 'Payment proof does not match received payment.',
    actor: 'owner'
  });

  res.redirect('/owner/bookings');
});

const confirmRemainingPayment = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, owner: req.currentUser._id })
    .populate('venue')
    .populate('owner')
    .populate('user');

  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }

  await confirmRemainingPaymentReceived({
    booking,
    confirmationNote: req.body.remainingPaymentNote || 'Remaining payment confirmed by owner.',
    actor: 'owner'
  });

  req.session.flash = { type: 'success', message: `Remaining payment confirmed for booking ${booking.bookingCode}.` };
  res.redirect('/owner/bookings');
});

const reuploadPaymentProof = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.currentUser._id });

  if (!booking) {
    throw new AppError('Booking not found.', 404);
  }

  await resubmitRejectedBookingPayment({
    booking,
    paymentReference: req.body.paymentReference,
    paymentScreenshot: req.file ? `/uploads/${req.file.filename}` : '',
    note: req.body.resubmitNote
  });

  res.redirect(`/dashboard/bookings/${booking._id}`);
});

module.exports = {
  bookingValidators,
  reuploadPaymentValidators,
  create,
  userBookings,
  bookingDetails,
  cancel,
  verifyPayment,
  rejectPayment,
  confirmRemainingPayment,
  reuploadPaymentProof
};