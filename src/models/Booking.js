const mongoose = require('mongoose');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../constants/booking');

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      default: () => `BKG-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true
    },
    sportType: {
      type: String,
      required: true
    },
    bookingDate: {
      type: Date,
      required: true
    },
    slotStartTime: {
      type: String,
      required: true
    },
    slotEndTime: {
      type: String,
      required: true
    },
    slotKey: {
      type: String,
      required: true
    },
    pricingBreakdown: {
      basePrice: { type: Number, required: true },
      discountAmount: { type: Number, default: 0 },
      totalPrice: { type: Number, required: true },
      bookingAmount: { type: Number, required: true },
      remainingAmount: { type: Number, required: true },
      appliedOfferLabel: String,
      appliedCouponCode: String
    },
    bookingStatus: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PARTIAL_PAID
    },
    paymentMethod: {
      type: String,
      default: 'Advance Reservation'
    },
    paymentReference: String,
    paymentProof: {
      screenshot: String,
      submittedAt: Date,
      ownerUpiId: String,
      ownerQrCodeImage: String,
      verificationNote: String,
      verifiedAt: Date
    },
    disputeHistory: [
      {
        actor: {
          type: String,
          enum: ['user', 'owner', 'admin', 'system'],
          default: 'system'
        },
        action: String,
        note: String,
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    slotLocked: {
      type: Boolean,
      default: true
    },
    userSnapshot: {
      fullName: String,
      email: String,
      phone: String
    },
    cancellation: {
      cancelledBy: String,
      cancelledAt: Date,
      reason: String,
      refundAmount: Number
    }
  },
  {
    timestamps: true
  }
);

bookingSchema.index(
  { slotKey: 1 },
  {
    unique: true,
    partialFilterExpression: { slotLocked: true }
  }
);

module.exports = mongoose.model('Booking', bookingSchema);