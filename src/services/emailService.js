const { sendMail } = require('../config/mailer');
const { formatDate } = require('../utils/time');

const buildBookingHtml = ({ heading, booking }) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
    <h2>${heading}</h2>
    <p><strong>Booking ID:</strong> ${booking.bookingCode}</p>
    <p><strong>User:</strong> ${booking.userSnapshot.fullName}</p>
    <p><strong>Email:</strong> ${booking.userSnapshot.email}</p>
    <p><strong>Phone:</strong> ${booking.userSnapshot.phone}</p>
    <p><strong>Venue:</strong> ${booking.venue.name}</p>
    <p><strong>Sport:</strong> ${booking.sportType}</p>
    <p><strong>Date:</strong> ${formatDate(booking.bookingDate)}</p>
    <p><strong>Slot:</strong> ${booking.slotStartTime} - ${booking.slotEndTime}</p>
    <p><strong>Total Price:</strong> ${booking.pricingBreakdown.totalPrice}</p>
    <p><strong>Advance Paid:</strong> ${booking.pricingBreakdown.bookingAmount}</p>
    <p><strong>Remaining Amount:</strong> ${booking.pricingBreakdown.remainingAmount}</p>
    <p><strong>Booking Status:</strong> ${booking.bookingStatus}</p>
    <p><strong>Payment Status:</strong> ${booking.paymentStatus}</p>
  </div>
`;

const sendBookingCreatedEmails = async ({ booking, ownerEmail, userEmail }) => {
  const ownerHtml = buildBookingHtml({ heading: 'New booking with payment proof submitted', booking });
  const userHtml = buildBookingHtml({ heading: 'Your booking request is pending owner verification', booking });

  await Promise.all([
    sendMail({ to: ownerEmail, subject: `Payment Proof Submitted ${booking.bookingCode}`, html: ownerHtml }),
    sendMail({ to: userEmail, subject: `Booking Submitted ${booking.bookingCode}`, html: userHtml })
  ]);
};

const sendBookingPaymentVerifiedEmails = async ({ booking, ownerEmail, userEmail }) => {
  const ownerHtml = buildBookingHtml({ heading: 'Advance payment verified successfully', booking });
  const userHtml = buildBookingHtml({ heading: 'Your slot is now confirmed', booking });

  await Promise.all([
    sendMail({ to: ownerEmail, subject: `Booking Confirmed ${booking.bookingCode}`, html: ownerHtml }),
    sendMail({ to: userEmail, subject: `Slot Confirmed ${booking.bookingCode}`, html: userHtml })
  ]);
};

const sendBookingCancelledEmails = async ({ booking, ownerEmail, userEmail }) => {
  const html = buildBookingHtml({ heading: 'Booking cancelled', booking });

  await Promise.all([
    sendMail({ to: ownerEmail, subject: `Booking Cancelled ${booking.bookingCode}`, html }),
    sendMail({ to: userEmail, subject: `Booking Cancelled ${booking.bookingCode}`, html })
  ]);
};

const sendBookingPaymentRejectedEmails = async ({ booking, ownerEmail, userEmail, reason }) => {
  const ownerHtml = `${buildBookingHtml({ heading: 'Payment proof rejected and slot released', booking })}<p><strong>Reason:</strong> ${reason}</p>`;
  const userHtml = `${buildBookingHtml({ heading: 'Your payment proof was rejected', booking })}<p><strong>Reason:</strong> ${reason}</p>`;

  await Promise.all([
    sendMail({ to: ownerEmail, subject: `Payment Rejected ${booking.bookingCode}`, html: ownerHtml }),
    sendMail({ to: userEmail, subject: `Payment Rejected ${booking.bookingCode}`, html: userHtml })
  ]);
};

module.exports = {
  sendBookingCreatedEmails,
  sendBookingCancelledEmails,
  sendBookingPaymentVerifiedEmails,
  sendBookingPaymentRejectedEmails
};