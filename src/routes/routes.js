const express = require('express');
const { imageUpload } = require('../config/multer');
const authController = require('../controllers/authController');
const venueController = require('../controllers/venueController');
const bookingController = require('../controllers/bookingController');
const dashboardController = require('../controllers/dashboardController');
const { requireAuth, requireGuest, requireRole } = require('../middlewares/authMiddleware');
const { handleValidation } = require('../middlewares/validationMiddleware');

const router = express.Router();

router.get('/', venueController.home);
router.get('/venues', venueController.listVenues);
router.get('/venues/:slug', venueController.showVenue);

router.get('/auth/register', requireGuest, authController.showRegister);
router.post('/auth/register', requireGuest, imageUpload.single('qrCodeImage'), authController.registerValidators, handleValidation, authController.register);
router.get('/auth/login', requireGuest, authController.showLogin);
router.post('/auth/login', requireGuest, authController.loginValidators, handleValidation, authController.login);
router.get('/auth/forgot-password', requireGuest, authController.showForgotPassword);
router.post('/auth/forgot-password', requireGuest, authController.forgotPasswordValidators, handleValidation, authController.forgotPassword);
router.get('/auth/reset-password/:token', requireGuest, authController.showResetPassword);
router.post('/auth/reset-password/:token', requireGuest, authController.resetPasswordValidators, handleValidation, authController.resetPassword);
router.post('/auth/logout', requireAuth, authController.logout);

router.get('/dashboard', requireAuth, dashboardController.showDashboard);
router.get('/dashboard/bookings', requireAuth, requireRole('user'), bookingController.userBookings);
router.get('/dashboard/bookings/:id', requireAuth, requireRole('user'), bookingController.bookingDetails);
router.post('/dashboard/bookings/:id/cancel', requireAuth, requireRole('user'), bookingController.cancel);
router.post(
  '/dashboard/bookings/:id/reupload-payment',
  requireAuth,
  requireRole('user'),
  imageUpload.single('paymentScreenshot'),
  bookingController.reuploadPaymentValidators,
  handleValidation,
  bookingController.reuploadPaymentProof
);

router.post(
  '/venues/:slug/book',
  requireAuth,
  requireRole('user'),
  imageUpload.single('paymentScreenshot'),
  bookingController.bookingValidators,
  handleValidation,
  bookingController.create
);

router.get('/owner', requireAuth, requireRole('owner'), dashboardController.showOwnerDashboard);
router.get('/owner/venues', requireAuth, requireRole('owner'), venueController.showOwnerVenues);
router.get('/owner/venues/new', requireAuth, requireRole('owner'), venueController.showCreateVenue);
router.get('/owner/venues/:id/edit', requireAuth, requireRole('owner'), venueController.showEditVenue);
router.post(
  '/owner/venues',
  requireAuth,
  requireRole('owner'),
  imageUpload.array('photos', 6),
  venueController.createVenueValidators,
  handleValidation,
  venueController.createVenue
);
router.post(
  '/owner/venues/:id',
  requireAuth,
  requireRole('owner'),
  imageUpload.array('photos', 6),
  venueController.updateVenueValidators,
  handleValidation,
  venueController.updateVenue
);
router.get('/owner/offers', requireAuth, requireRole('owner'), venueController.showOwnerOffers);
router.post('/owner/offers', requireAuth, requireRole('owner'), venueController.offerValidators, handleValidation, venueController.createOffer);
router.post('/owner/offers/:id/toggle', requireAuth, requireRole('owner'), venueController.toggleOfferStatus);
router.post('/owner/offers/:id/delete', requireAuth, requireRole('owner'), venueController.deleteOffer);
router.get('/owner/venues/:id/slots', requireAuth, requireRole('owner'), venueController.showManageSlots);
router.post('/owner/venues/:id/slots/block', requireAuth, requireRole('owner'), venueController.blockSlotValidators, handleValidation, venueController.addBlockedSlot);
router.post('/owner/venues/:id/slots/unblock', requireAuth, requireRole('owner'), venueController.removeBlockedSlot);
router.get('/owner/bookings', requireAuth, requireRole('owner'), dashboardController.showOwnerBookings);
router.post('/owner/bookings/:id/verify-payment', requireAuth, requireRole('owner'), bookingController.verifyPayment);
router.post('/owner/bookings/:id/reject-payment', requireAuth, requireRole('owner'), bookingController.rejectPayment);
router.post('/owner/bookings/:id/confirm-remaining-payment', requireAuth, requireRole('owner'), bookingController.confirmRemainingPayment);
router.get('/owner/payment-settings', requireAuth, requireRole('owner'), dashboardController.showOwnerPaymentSettings);
router.post('/owner/payment-settings', requireAuth, requireRole('owner'), imageUpload.single('ownerQrCodeImage'), dashboardController.updateOwnerPaymentSettings);

router.get('/admin', requireAuth, requireRole('admin'), dashboardController.showAdminDashboard);
router.get('/admin/users', requireAuth, requireRole('admin'), dashboardController.showAdminUsers);
router.post('/admin/users/:id/approve', requireAuth, requireRole('admin'), dashboardController.approveOwner);
router.post('/admin/users/:id/reject', requireAuth, requireRole('admin'), dashboardController.rejectOwner);
router.get('/admin/venues', requireAuth, requireRole('admin'), dashboardController.showAdminVenues);
router.post('/admin/venues/:id/approve', requireAuth, requireRole('admin'), dashboardController.approveVenue);
router.post('/admin/venues/:id/reject', requireAuth, requireRole('admin'), dashboardController.rejectVenue);
router.get('/admin/payments', requireAuth, requireRole('admin'), dashboardController.showAdminPayments);

module.exports = router;
