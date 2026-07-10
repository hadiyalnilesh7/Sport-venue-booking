const BOOKING_STATUS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PAYMENT_DUE: 'Payment Due',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed'
};

const PAYMENT_STATUS = {
  PENDING: 'Pending',
  PARTIAL_PAID: 'Partial Paid',
  FULLY_PAID: 'Fully Paid',
  REFUNDED: 'Refunded'
};

module.exports = {
  BOOKING_STATUS,
  PAYMENT_STATUS
};