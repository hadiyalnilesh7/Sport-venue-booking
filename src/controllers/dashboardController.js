const User = require('../models/User');
const Venue = require('../models/Venue');
const Booking = require('../models/Booking');
const Offer = require('../models/Offer');
const WalletTransaction = require('../models/WalletTransaction');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { formatDate } = require('../utils/time');
const { PAYMENT_STATUS, BOOKING_STATUS } = require('../constants/booking');
const { syncBookingsLifecycleStatuses } = require('../services/bookingService');

const showDashboard = asyncHandler(async (req, res) => {
  if (req.currentUser.role === 'owner') {
    res.redirect('/owner');
    return;
  }

  if (req.currentUser.role === 'admin') {
    res.redirect('/admin');
    return;
  }

  const bookings = await Booking.find({ user: req.currentUser._id }).populate('venue').sort({ createdAt: -1 }).limit(5);
  await syncBookingsLifecycleStatuses(bookings);

  res.render('pages/dashboard/user-home', {
    title: 'User Dashboard',
    bookings,
    formatDate
  });
});

const showOwnerDashboard = asyncHandler(async (req, res) => {
  const [venues, bookings, offers, walletTransactions] = await Promise.all([
    Venue.find({ owner: req.currentUser._id }),
    Booking.find({ owner: req.currentUser._id }).populate('venue').sort({ createdAt: -1 }).limit(5),
    Offer.find({ owner: req.currentUser._id, isActive: true }),
    WalletTransaction.find({ owner: req.currentUser._id })
  ]);

  await syncBookingsLifecycleStatuses(bookings);

  const monthlyEarnings = walletTransactions.reduce((total, item) => total + item.amount, 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayBookings = bookings.filter((item) => item.bookingDate.toISOString().slice(0, 10) === today).length;

  res.render('pages/dashboard/owner-home', {
    title: 'Owner Dashboard',
    summary: {
      totalVenues: venues.length,
      totalBookings: bookings.length,
      todayBookings,
      monthlyEarnings,
      activeOffers: offers.length,
      slotUtilization: venues.length ? Math.round((bookings.length / Math.max(venues.length, 1)) * 10) : 0
    },
    bookings,
    formatDate
  });
});

const showOwnerBookings = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const query = { owner: req.currentUser._id };
  if (from || to) {
    query.bookingDate = {};
    if (from) query.bookingDate.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query.bookingDate.$lte = toDate;
    }
  }
  const bookings = await Booking.find(query).populate('venue user').sort({ createdAt: -1 });
  await syncBookingsLifecycleStatuses(bookings);
  const paymentSummary = bookings.reduce(
    (summary, booking) => {
      const totalPrice = booking.pricingBreakdown?.totalPrice || 0;
      const bookingAmount = booking.pricingBreakdown?.bookingAmount || 0;
      const remainingAmount = booking.pricingBreakdown?.remainingAmount || 0;
      const isCancelled = booking.bookingStatus === BOOKING_STATUS.CANCELLED;
      const isFullyPaid = booking.paymentStatus === PAYMENT_STATUS.FULLY_PAID;

      summary.totalAmount += totalPrice;

      if (isFullyPaid) {
        summary.totalReceived += totalPrice;
      } else if (!isCancelled && booking.paymentStatus !== PAYMENT_STATUS.PENDING) {
        summary.totalReceived += bookingAmount;
      }

      if (!isCancelled && !isFullyPaid) {
        summary.pendingBalance += remainingAmount;
      }

      return summary;
    },
    { totalAmount: 0, totalReceived: 0, pendingBalance: 0 }
  );

  res.render('pages/dashboard/owner-bookings', {
    title: 'Owner Bookings',
    bookings,
    paymentSummary,
    formatDate,
    from: from || '',
    to: to || ''
  });
});

const showOwnerPaymentSettings = asyncHandler(async (req, res) => {
  res.render('pages/dashboard/owner-payment-settings', {
    title: 'Payment Settings',
    owner: req.currentUser
  });
});

const updateOwnerPaymentSettings = asyncHandler(async (req, res) => {
  const owner = await User.findOne({ _id: req.currentUser._id, role: 'owner' });
  if (!owner) {
    throw new AppError('Owner account not found.', 404);
  }

  owner.paymentDetails = {
    accountHolderName: req.body.accountHolderName,
    upiId: req.body.upiId,
    qrCodeImage: req.file ? `/uploads/${req.file.filename}` : owner.paymentDetails?.qrCodeImage || ''
  };
  await owner.save();

  req.session.flash = { type: 'success', message: 'Payment settings updated successfully.' };
  res.redirect('/owner/payment-settings');
});

const showAdminDashboard = asyncHandler(async (req, res) => {
  const [usersCount, ownersPending, venuesPending, bookingsCount] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'owner', isApproved: false }),
    Venue.countDocuments({ isApproved: false }),
    Booking.countDocuments()
  ]);

  res.render('pages/dashboard/admin-home', {
    title: 'Admin Dashboard',
    summary: {
      usersCount,
      ownersPending,
      venuesPending,
      bookingsCount
    }
  });
});

const showAdminUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.render('pages/dashboard/admin-users', {
    title: 'Manage Users',
    users
  });
});

const showAdminPayments = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const query = { paymentProof: { $exists: true }, paymentReference: { $ne: null } };
  if (from || to) {
    query.bookingDate = {};
    if (from) query.bookingDate.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query.bookingDate.$lte = toDate;
    }
  }
  const bookings = await Booking.find(query)
    .populate('venue')
    .populate('owner')
    .populate('user')
    .sort({ createdAt: -1 });

  await syncBookingsLifecycleStatuses(bookings);

  res.render('pages/dashboard/admin-payments', {
    title: 'Payment Reviews',
    bookings,
    formatDate,
    from: from || '',
    to: to || ''
  });
});

const showAdminVenues = asyncHandler(async (_req, res) => {
  const venues = await Venue.find().populate('owner').sort({ createdAt: -1 });
  res.render('pages/dashboard/admin-venues', {
    title: 'Manage Venues',
    venues
  });
});

const approveVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    throw new AppError('Venue not found.', 404);
  }

  venue.isApproved = true;
  venue.status = 'active';
  await venue.save();

  req.session.flash = { type: 'success', message: `Venue "${venue.name}" has been approved and is now live.` };
  res.redirect('/admin/venues');
});

const rejectVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    throw new AppError('Venue not found.', 404);
  }

  venue.isApproved = false;
  venue.status = 'inactive';
  await venue.save();

  req.session.flash = { type: 'success', message: `Venue "${venue.name}" has been rejected.` };
  res.redirect('/admin/venues');
});

const approveOwner = asyncHandler(async (req, res) => {
  const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
  if (!owner) {
    throw new AppError('Owner not found.', 404);
  }

  owner.isApproved = true;
  await owner.save();

  req.session.flash = { type: 'success', message: `Owner "${owner.fullName}" has been approved.` };
  res.redirect('/admin/users');
});

const rejectOwner = asyncHandler(async (req, res) => {
  const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
  if (!owner) {
    throw new AppError('Owner not found.', 404);
  }

  owner.isApproved = false;
  await owner.save();

  req.session.flash = { type: 'success', message: `Owner "${owner.fullName}" has been rejected.` };
  res.redirect('/admin/users');
});

module.exports = {
  showDashboard,
  showOwnerDashboard,
  showOwnerBookings,
  showOwnerPaymentSettings,
  updateOwnerPaymentSettings,
  showAdminDashboard,
  showAdminUsers,
  showAdminPayments,
  showAdminVenues,
  approveVenue,
  rejectVenue,
  approveOwner,
  rejectOwner
};