const Booking = require('../models/Booking');
const WalletTransaction = require('../models/WalletTransaction');
const AppError = require('../utils/AppError');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../constants/booking');
const { buildPricingBreakdown } = require('./pricingService');
const { buildSlotKey, getAvailableSlots } = require('./slotService');
const { normalizeDate } = require('../utils/time');
const {
  sendBookingCreatedEmails,
  sendBookingCancelledEmails,
  sendBookingPaymentVerifiedEmails,
  sendBookingPaymentRejectedEmails
} = require('./emailService');

const appendDisputeHistory = (booking, actor, action, note) => {
  booking.disputeHistory = booking.disputeHistory || [];
  booking.disputeHistory.push({ actor, action, note, createdAt: new Date() });
};

const normalizeSportType = (sportType = '') => String(sportType).trim().toLowerCase();

const combineBookingDateTime = (bookingDate, slotTime = '00:00') => {
  const date = normalizeDate(bookingDate);
  const [hours, minutes] = String(slotTime || '00:00').split(':').map(Number);

  date.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date;
};

const resolveLifecycleStatus = (booking, now = new Date()) => {
  if (booking.bookingStatus === BOOKING_STATUS.CANCELLED) {
    return booking.bookingStatus;
  }

  const slotEndDateTime = combineBookingDateTime(booking.bookingDate, booking.slotEndTime);
  const isTimeOver = slotEndDateTime.getTime() <= now.getTime();

  if (!isTimeOver) {
    if (booking.bookingStatus === BOOKING_STATUS.PAYMENT_DUE) {
      return BOOKING_STATUS.CONFIRMED;
    }

    return booking.bookingStatus;
  }

  if (booking.paymentStatus === PAYMENT_STATUS.FULLY_PAID) {
    return BOOKING_STATUS.COMPLETED;
  }

  if (
    booking.bookingStatus === BOOKING_STATUS.CONFIRMED
    || booking.bookingStatus === BOOKING_STATUS.COMPLETED
    || booking.bookingStatus === BOOKING_STATUS.PAYMENT_DUE
  ) {
    return BOOKING_STATUS.PAYMENT_DUE;
  }

  return booking.bookingStatus;
};

const syncBookingLifecycleStatus = async (booking, now = new Date()) => {
  const nextStatus = resolveLifecycleStatus(booking, now);

  if (nextStatus !== booking.bookingStatus) {
    booking.bookingStatus = nextStatus;
    await booking.save();
  }

  return booking;
};

const syncBookingsLifecycleStatuses = async (bookings, now = new Date()) => {
  if (!bookings || bookings.length === 0) {
    return bookings;
  }

  await Promise.all(bookings.map((booking) => syncBookingLifecycleStatus(booking, now)));
  return bookings;
};

const createBooking = async ({ user, venue, sportType, bookingDate, slotStartTime, couponCode, paymentReference, paymentScreenshot }) => {
  const normalizedDate = normalizeDate(bookingDate);
  const availableSlots = await getAvailableSlots(venue, normalizedDate);
  const targetSlot = availableSlots.find((item) => item.startTime === slotStartTime && item.isAvailable);
  const ownerPaymentDetails = venue.owner.paymentDetails || {};
  const matchedSportType = venue.sportTypes.find(
    (item) => normalizeSportType(item) === normalizeSportType(sportType)
  );

  if (!targetSlot) {
    throw new AppError('This slot is no longer available. Please choose another slot.', 409);
  }

  if (!matchedSportType) {
    throw new AppError('Selected sport is not available at this venue.', 422);
  }

  if (!ownerPaymentDetails.upiId && !ownerPaymentDetails.qrCodeImage) {
    throw new AppError('This venue owner has not added UPI or QR payment details yet.', 422);
  }

  const pricingBreakdown = await buildPricingBreakdown({
    venue,
    bookingDate: normalizedDate,
    couponCode,
    sportType: matchedSportType
  });

  if (!paymentReference || !paymentScreenshot) {
    throw new AppError('Please pay the advance amount and upload the payment screenshot before booking.', 422);
  }

  let booking;

  try {
    booking = await Booking.create({
      user: user._id,
      owner: venue.owner,
      venue: venue._id,
      sportType: matchedSportType,
      bookingDate: normalizedDate,
      slotStartTime,
      slotEndTime: targetSlot.endTime,
      slotKey: buildSlotKey(venue._id, normalizedDate, slotStartTime),
      pricingBreakdown,
      bookingStatus: BOOKING_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentMethod: 'Manual UPI / QR Payment',
      paymentReference,
      paymentProof: {
        screenshot: paymentScreenshot,
        submittedAt: new Date(),
        ownerUpiId: ownerPaymentDetails.upiId || '',
        ownerQrCodeImage: ownerPaymentDetails.qrCodeImage || ''
      },
      disputeHistory: [
        {
          actor: 'user',
          action: 'payment_submitted',
          note: 'User submitted advance payment proof.'
        }
      ],
      userSnapshot: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('Another booking already reserved this slot.', 409);
    }

    throw error;
  }

  const populatedBooking = await Booking.findById(booking._id).populate('venue');
  await sendBookingCreatedEmails({
    booking: populatedBooking,
    ownerEmail: venue.owner.email,
    userEmail: user.email
  });

  return populatedBooking;
};

const verifyBookingPayment = async ({ booking, verificationNote, actor = 'owner' }) => {
  if (booking.paymentStatus === PAYMENT_STATUS.PARTIAL_PAID || booking.paymentStatus === PAYMENT_STATUS.FULLY_PAID) {
    throw new AppError('This booking payment is already verified.', 400);
  }

  booking.bookingStatus = BOOKING_STATUS.CONFIRMED;
  booking.paymentStatus = PAYMENT_STATUS.PARTIAL_PAID;
  booking.paymentProof = {
    ...booking.paymentProof,
    verificationNote,
    verifiedAt: new Date()
  };
  appendDisputeHistory(booking, actor, 'payment_verified', verificationNote);
  await booking.save();

  const existingWalletEntry = await WalletTransaction.findOne({ booking: booking._id, type: 'advance_received' });
  if (!existingWalletEntry) {
    await WalletTransaction.create({
      owner: booking.owner._id || booking.owner,
      booking: booking._id,
      venue: booking.venue._id,
      amount: booking.pricingBreakdown.bookingAmount,
      type: 'advance_received',
      status: 'completed',
      note: `Advance verified for ${booking.bookingCode}`
    });
  }

  await sendBookingPaymentVerifiedEmails({
    booking,
    ownerEmail: booking.owner.email,
    userEmail: booking.user.email
  });

  return booking;
};

const rejectBookingPayment = async ({ booking, rejectionReason, actor = 'owner' }) => {
  if (booking.bookingStatus === BOOKING_STATUS.CANCELLED) {
    throw new AppError('This booking is already cancelled.', 400);
  }

  booking.bookingStatus = BOOKING_STATUS.CANCELLED;
  booking.paymentStatus = PAYMENT_STATUS.PENDING;
  booking.slotLocked = false;
  booking.paymentProof = {
    ...booking.paymentProof,
    verificationNote: rejectionReason,
    verifiedAt: new Date()
  };
  appendDisputeHistory(booking, actor, 'payment_rejected', rejectionReason);
  booking.cancellation = {
    cancelledBy: 'owner_or_admin',
    cancelledAt: new Date(),
    reason: `Payment proof rejected: ${rejectionReason}`,
    refundAmount: 0
  };
  await booking.save();

  await sendBookingPaymentRejectedEmails({
    booking,
    ownerEmail: booking.owner.email,
    userEmail: booking.user.email,
    reason: rejectionReason
  });

  return booking;
};

const confirmRemainingPaymentReceived = async ({ booking, confirmationNote, actor = 'owner' }) => {
  if (booking.bookingStatus === BOOKING_STATUS.CANCELLED) {
    throw new AppError('Cancelled bookings cannot be marked as fully paid.', 400);
  }

  if (booking.paymentStatus === PAYMENT_STATUS.PENDING) {
    throw new AppError('Please verify the advance payment before confirming remaining payment.', 400);
  }

  if (booking.paymentStatus === PAYMENT_STATUS.FULLY_PAID) {
    throw new AppError('Remaining payment is already confirmed for this booking.', 400);
  }

  booking.paymentStatus = PAYMENT_STATUS.FULLY_PAID;
  booking.bookingStatus = BOOKING_STATUS.COMPLETED;
  booking.paymentProof = {
    ...booking.paymentProof,
    verificationNote: confirmationNote || booking.paymentProof?.verificationNote || 'Owner confirmed remaining payment received.',
    verifiedAt: new Date()
  };
  appendDisputeHistory(booking, actor, 'remaining_payment_confirmed', confirmationNote || 'Owner confirmed remaining payment received.');
  await booking.save();

  const existingWalletEntry = await WalletTransaction.findOne({ booking: booking._id, type: 'payout_completed' });
  if (!existingWalletEntry && booking.pricingBreakdown.remainingAmount > 0) {
    await WalletTransaction.create({
      owner: booking.owner._id || booking.owner,
      booking: booking._id,
      venue: booking.venue._id || booking.venue,
      amount: booking.pricingBreakdown.remainingAmount,
      type: 'payout_completed',
      status: 'completed',
      note: `Remaining payment confirmed for ${booking.bookingCode}`
    });
  }

  return booking;
};

const resubmitRejectedBookingPayment = async ({ booking, paymentReference, paymentScreenshot, note }) => {
  if (booking.bookingStatus !== BOOKING_STATUS.CANCELLED || !booking.cancellation?.reason?.startsWith('Payment proof rejected:')) {
    throw new AppError('Only payment-rejected bookings can be resubmitted.', 400);
  }

  if (!paymentReference || !paymentScreenshot) {
    throw new AppError('Payment reference and screenshot are required for re-upload.', 422);
  }

  const conflictingBooking = await Booking.findOne({
    _id: { $ne: booking._id },
    slotKey: booking.slotKey,
    slotLocked: true
  });

  if (conflictingBooking) {
    throw new AppError('This slot is already taken now. Please create a new booking for another slot.', 409);
  }

  booking.bookingStatus = BOOKING_STATUS.PENDING;
  booking.paymentStatus = PAYMENT_STATUS.PENDING;
  booking.slotLocked = true;
  booking.paymentReference = paymentReference;
  booking.paymentProof = {
    ...booking.paymentProof,
    screenshot: paymentScreenshot,
    submittedAt: new Date(),
    verificationNote: '',
    verifiedAt: null
  };
  booking.cancellation = undefined;
  appendDisputeHistory(booking, 'user', 'payment_resubmitted', note || 'User re-uploaded payment proof.');
  await booking.save();

  return booking;
};

const cancelBooking = async ({ booking, cancelledBy, reason }) => {
  booking.bookingStatus = BOOKING_STATUS.CANCELLED;
  booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
  booking.slotLocked = false;
  booking.cancellation = {
    cancelledBy,
    cancelledAt: new Date(),
    reason,
    refundAmount: booking.pricingBreakdown.bookingAmount
  };
  appendDisputeHistory(booking, cancelledBy === 'user' ? 'user' : 'system', 'booking_cancelled', reason);
  await booking.save();

  await WalletTransaction.create({
    owner: booking.owner,
    booking: booking._id,
    venue: booking.venue._id,
    amount: booking.pricingBreakdown.bookingAmount,
    type: 'refund',
    status: 'completed',
    note: `Refund recorded for ${booking.bookingCode}`
  });

  await sendBookingCancelledEmails({
    booking,
    ownerEmail: booking.owner.email,
    userEmail: booking.user.email
  });

  return booking;
};

module.exports = {
  createBooking,
  cancelBooking,
  verifyBookingPayment,
  rejectBookingPayment,
  resubmitRejectedBookingPayment,
  confirmRemainingPaymentReceived,
  syncBookingLifecycleStatus,
  syncBookingsLifecycleStatuses
};