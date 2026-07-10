const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue'
    },
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['advance_received', 'payout_pending', 'payout_completed', 'refund'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed'
    },
    note: String
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);