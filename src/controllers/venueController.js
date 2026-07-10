const { body } = require('express-validator');
const Venue = require('../models/Venue');
const Review = require('../models/Review');
const Offer = require('../models/Offer');
const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');
const { buildPricingBreakdown, getVenueStartingPrice, resolveSportPricing } = require('../services/pricingService');
const { getAvailableSlots, generateDailySlots } = require('../services/slotService');
const { formatDate, normalizeDate } = require('../utils/time');
const AppError = require('../utils/AppError');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeSportType = (value = '') => String(value).trim().toLowerCase();
const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'undefined' || value === null || value === '') {
    return [];
  }

  return [value];
};

const parseSportTypes = (value = '') => {
  const uniqueSportTypes = new Map();

  String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((sportType) => {
      const normalized = normalizeSportType(sportType);
      if (!uniqueSportTypes.has(normalized)) {
        uniqueSportTypes.set(normalized, sportType);
      }
    });

  return Array.from(uniqueSportTypes.values());
};

const buildSportPricingEntries = ({ sportTypes, body, fallbackPricing }) => {
  const inputSportTypes = toArray(body.sportPricingSportType);
  const weekdayPrices = toArray(body.sportPricingWeekdayPrice);
  const saturdayPrices = toArray(body.sportPricingSaturdayPrice);
  const sundayPrices = toArray(body.sportPricingSundayPrice);
  const sportPricingMap = new Map();

  inputSportTypes.forEach((sportType, index) => {
    const trimmedSportType = String(sportType || '').trim();
    const normalizedSportType = normalizeSportType(trimmedSportType);

    if (!normalizedSportType) {
      return;
    }

    sportPricingMap.set(normalizedSportType, {
      sportType: trimmedSportType,
      weekdayPrice: Number(weekdayPrices[index]) || fallbackPricing.weekdayPrice,
      saturdayPrice: Number(saturdayPrices[index]) || fallbackPricing.saturdayPrice,
      sundayPrice: Number(sundayPrices[index]) || fallbackPricing.sundayPrice
    });
  });

  return sportTypes.map((sportType) => {
    const normalizedSportType = normalizeSportType(sportType);
    const existingPricing = sportPricingMap.get(normalizedSportType);

    return {
      sportType,
      weekdayPrice: existingPricing ? existingPricing.weekdayPrice : fallbackPricing.weekdayPrice,
      saturdayPrice: existingPricing ? existingPricing.saturdayPrice : fallbackPricing.saturdayPrice,
      sundayPrice: existingPricing ? existingPricing.sundayPrice : fallbackPricing.sundayPrice
    };
  });
};

const resolveSelectedSportType = (venue, requestedSportType = '') => {
  const matchedSportType = venue.sportTypes.find(
    (sportType) => normalizeSportType(sportType) === normalizeSportType(requestedSportType)
  );

  return matchedSportType || venue.sportTypes[0] || '';
};

const createVenueValidators = [
  body('name').trim().notEmpty().withMessage('Venue name is required.'),
  body('sportTypes').trim().notEmpty().withMessage('At least one sport type is required.'),
  body('city').trim().notEmpty().withMessage('City is required.'),
  body('address').trim().notEmpty().withMessage('Address is required.'),
  body('description').trim().notEmpty().withMessage('Description is required.'),
  body('openingTime').trim().notEmpty().withMessage('Opening time is required.'),
  body('closingTime').trim().notEmpty().withMessage('Closing time is required.'),
  body('weekdayPrice').isFloat({ min: 1 }).withMessage('Weekday price must be a number.'),
  body('saturdayPrice').isFloat({ min: 1 }).withMessage('Saturday price must be a number.'),
  body('sundayPrice').isFloat({ min: 1 }).withMessage('Sunday price must be a number.')
];

const updateVenueValidators = [
  body('name').trim().notEmpty().withMessage('Venue name is required.'),
  body('sportTypes').trim().notEmpty().withMessage('At least one sport type is required.'),
  body('city').trim().notEmpty().withMessage('City is required.'),
  body('address').trim().notEmpty().withMessage('Address is required.'),
  body('description').trim().notEmpty().withMessage('Description is required.'),
  body('openingTime').trim().notEmpty().withMessage('Opening time is required.'),
  body('closingTime').trim().notEmpty().withMessage('Closing time is required.'),
  body('weekdayPrice').isFloat({ min: 1 }).withMessage('Weekday price must be a number.'),
  body('saturdayPrice').isFloat({ min: 1 }).withMessage('Saturday price must be a number.'),
  body('sundayPrice').isFloat({ min: 1 }).withMessage('Sunday price must be a number.')
];

const offerValidators = [
  body('venueId').trim().notEmpty().withMessage('Venue is required.'),
  body('title').trim().notEmpty().withMessage('Offer title is required.'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Discount type is invalid.'),
  body('discountValue').isFloat({ min: 1 }).withMessage('Discount value must be a positive number.'),
  body('appliesOn').isIn(['everyday', 'weekday', 'saturday', 'sunday']).withMessage('Offer day type is invalid.'),
  body('startDate').isISO8601().withMessage('Start date is required.'),
  body('endDate').isISO8601().withMessage('End date is required.')
];

const blockSlotValidators = [
  body('date').isISO8601().withMessage('A valid date is required.'),
  body('startTime').trim().notEmpty().withMessage('Start time is required.'),
  body('endTime').trim().notEmpty().withMessage('End time is required.'),
  body('reason').optional({ values: 'falsy' }).trim(),
  body('autoUnblockAt').optional({ values: 'falsy' }).isISO8601().withMessage('Auto-unblock datetime is invalid.')
];

const home = asyncHandler(async (req, res) => {
  const venues = await Venue.find({ isApproved: true, status: 'active' }).sort({ isFeatured: -1, createdAt: -1 }).limit(12);
  const now = new Date();
  const venueIds = venues.map((v) => v._id);
  const activeOffers = await Offer.find({ venue: { $in: venueIds }, isActive: true, startDate: { $lte: now }, endDate: { $gte: now } });
  const offersMap = {};
  activeOffers.forEach((o) => { offersMap[o.venue.toString()] = o; });
  res.render('pages/venues/index', {
    title: 'Find Sports Venues',
    venues,
    offersMap,
    getVenueStartingPrice,
    filters: req.query,
    selectedDate: req.query.date || '',
    formatDate
  });
});

const listVenues = asyncHandler(async (req, res) => {
  const { location, sportType, maxPrice, rating, date } = req.query;
  const query = { isApproved: true, status: 'active' };

  if (location) {
    query.$or = [
      { 'location.city': new RegExp(location, 'i') },
      { 'location.area': new RegExp(location, 'i') },
      { 'location.address': new RegExp(location, 'i') }
    ];
  }

  if (sportType) {
    query.sportTypes = new RegExp(escapeRegex(String(sportType).trim()), 'i');
  }

  if (rating) {
    query.ratingAverage = { $gte: Number(rating) };
  }

  const venues = await Venue.find(query).sort({ isFeatured: -1, createdAt: -1 });
  const filteredVenues = [];

  for (const venue of venues) {
    const comparePrice = getVenueStartingPrice(venue);
    if (maxPrice && comparePrice > Number(maxPrice)) {
      continue;
    }

    if (date) {
      const slots = await getAvailableSlots(venue, date);
      if (!slots.some((slot) => slot.isAvailable)) {
        continue;
      }
    }

    filteredVenues.push(venue);
  }

  const now = new Date();
  const venueIds = filteredVenues.map((v) => v._id);
  const activeOffers = await Offer.find({ venue: { $in: venueIds }, isActive: true, startDate: { $lte: now }, endDate: { $gte: now } });
  const offersMap = {};
  activeOffers.forEach((o) => { offersMap[o.venue.toString()] = o; });

  res.render('pages/venues/index', {
    title: 'Browse Venues',
    venues: filteredVenues,
    offersMap,
    getVenueStartingPrice,
    filters: req.query,
    selectedDate: date || '',
    formatDate
  });
});

const showVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findOne({ slug: req.params.slug, isApproved: true }).populate('owner');

  if (!venue) {
    throw new AppError('Venue not found.', 404);
  }

  const selectedDate = req.query.date || new Date().toISOString().slice(0, 10);
  const selectedSportType = resolveSelectedSportType(venue, req.query.sportType);
  const now = new Date();
  const [slots, pricingEntries, reviews, activeOffers] = await Promise.all([
    getAvailableSlots(venue, selectedDate),
    Promise.all(
      venue.sportTypes.map(async (sportType) => [
        sportType,
        await buildPricingBreakdown({ venue, bookingDate: selectedDate, sportType })
      ])
    ),
    Review.find({ venue: venue._id }).populate('user').sort({ createdAt: -1 }).limit(6),
    Offer.find({ venue: venue._id, isActive: true, startDate: { $lte: now }, endDate: { $gte: now } })
  ]);

  const pricingPreviewBySport = Object.fromEntries(pricingEntries);
  const pricingPreview = pricingPreviewBySport[selectedSportType] || await buildPricingBreakdown({
    venue,
    bookingDate: selectedDate,
    sportType: selectedSportType
  });
  const sportPricingDetails = venue.sportTypes.map((sportType) => ({
    sportType,
    ...resolveSportPricing(venue, sportType)
  }));

  res.render('pages/venues/show', {
    title: venue.name,
    venue,
    slots,
    reviews,
    activeOffers,
    selectedDate,
    selectedSportType,
    pricingPreview,
    pricingPreviewBySport,
    sportPricingDetails,
    normalizeDate,
    formatDate
  });
});

const showOwnerVenues = asyncHandler(async (req, res) => {
  const venues = await Venue.find({ owner: req.currentUser._id }).sort({ createdAt: -1 });
  res.render('pages/dashboard/owner-venues', {
    title: 'Manage Venues',
    venues
  });
});

const showCreateVenue = (_req, res) => {
  res.render('pages/dashboard/owner-venue-form', {
    title: 'Add Venue'
  });
};

const showEditVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findOne({ _id: req.params.id, owner: req.currentUser._id });

  if (!venue) {
    throw new AppError('Venue not found.', 404);
  }

  res.render('pages/dashboard/owner-venue-edit', {
    title: 'Edit Venue',
    venue
  });
});

const createVenue = asyncHandler(async (req, res) => {
  if (!req.currentUser.isApproved) {
    throw new AppError('Your owner account is waiting for admin approval.', 403);
  }

  const photos = (req.files || []).map((file) => `/uploads/${file.filename}`);
  const sportTypes = parseSportTypes(req.body.sportTypes);
  const fallbackPricing = {
    weekdayPrice: Number(req.body.weekdayPrice),
    saturdayPrice: Number(req.body.saturdayPrice),
    sundayPrice: Number(req.body.sundayPrice)
  };
  await Venue.create({
    owner: req.currentUser._id,
    name: req.body.name,
    sportTypes,
    location: {
      city: req.body.city,
      area: req.body.area,
      address: req.body.address,
      mapLink: req.body.mapLink,
      coordinates: {
        latitude: req.body.latitude || undefined,
        longitude: req.body.longitude || undefined
      }
    },
    description: req.body.description,
    amenities: (req.body.amenities || '').split(',').map((item) => item.trim()).filter(Boolean),
    openingTime: req.body.openingTime,
    closingTime: req.body.closingTime,
    slotDurationMinutes: Number(req.body.slotDurationMinutes) || 120,
    pricing: {
      baseTwoHourPrice: Number(req.body.baseTwoHourPrice) || Number(req.body.weekdayPrice),
      weekdayPrice: fallbackPricing.weekdayPrice,
      saturdayPrice: fallbackPricing.saturdayPrice,
      sundayPrice: fallbackPricing.sundayPrice,
      sportPricing: buildSportPricingEntries({ sportTypes, body: req.body, fallbackPricing }),
      advancePercentage: Number(req.body.advancePercentage) || 25
    },
    photos,
    isApproved: false,
    status: 'draft'
  });

  res.redirect('/owner/venues');
});

const updateVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findOne({ _id: req.params.id, owner: req.currentUser._id });

  if (!venue) {
    throw new AppError('Venue not found.', 404);
  }

  const newPhotos = (req.files || []).map((file) => `/uploads/${file.filename}`);
  const sportTypes = parseSportTypes(req.body.sportTypes);
  const fallbackPricing = {
    weekdayPrice: Number(req.body.weekdayPrice),
    saturdayPrice: Number(req.body.saturdayPrice),
    sundayPrice: Number(req.body.sundayPrice)
  };
  venue.name = req.body.name;
  venue.sportTypes = sportTypes;
  venue.location = {
    city: req.body.city,
    area: req.body.area,
    address: req.body.address,
    mapLink: req.body.mapLink,
    coordinates: {
      latitude: req.body.latitude || undefined,
      longitude: req.body.longitude || undefined
    }
  };
  venue.description = req.body.description;
  venue.amenities = (req.body.amenities || '').split(',').map((item) => item.trim()).filter(Boolean);
  venue.openingTime = req.body.openingTime;
  venue.closingTime = req.body.closingTime;
  venue.slotDurationMinutes = Number(req.body.slotDurationMinutes) || 120;
  venue.pricing = {
    baseTwoHourPrice: Number(req.body.baseTwoHourPrice) || Number(req.body.weekdayPrice),
    weekdayPrice: fallbackPricing.weekdayPrice,
    saturdayPrice: fallbackPricing.saturdayPrice,
    sundayPrice: fallbackPricing.sundayPrice,
    sportPricing: buildSportPricingEntries({ sportTypes, body: req.body, fallbackPricing }),
    advancePercentage: Number(req.body.advancePercentage) || venue.pricing.advancePercentage || 25
  };
  if (newPhotos.length) {
    venue.photos = [...venue.photos, ...newPhotos];
  }

  await venue.save();
  req.session.flash = { type: 'success', message: 'Venue details and prices updated successfully.' };
  res.redirect('/owner/venues');
});

const showOwnerOffers = asyncHandler(async (req, res) => {
  const [venues, offers] = await Promise.all([
    Venue.find({ owner: req.currentUser._id }).sort({ createdAt: -1 }),
    Offer.find({ owner: req.currentUser._id }).populate('venue').sort({ createdAt: -1 })
  ]);

  res.render('pages/dashboard/owner-offers', {
    title: 'Manage Offers',
    venues,
    offers,
    formatDate
  });
});

const createOffer = asyncHandler(async (req, res) => {
  const venue = await Venue.findOne({ _id: req.body.venueId, owner: req.currentUser._id });
  if (!venue) {
    throw new AppError('Selected venue is not available for this owner.', 404);
  }

  await Offer.create({
    owner: req.currentUser._id,
    venue: req.body.venueId,
    title: req.body.title,
    discountType: req.body.discountType,
    discountValue: Number(req.body.discountValue),
    code: req.body.code,
    appliesOn: req.body.appliesOn,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    isActive: true
  });

  req.session.flash = { type: 'success', message: 'Offer created successfully.' };
  res.redirect('/owner/offers');
});

const toggleOfferStatus = asyncHandler(async (req, res) => {
  const offer = await Offer.findOne({ _id: req.params.id, owner: req.currentUser._id });
  if (!offer) {
    throw new AppError('Offer not found.', 404);
  }

  offer.isActive = !offer.isActive;
  await offer.save();

  req.session.flash = { type: 'success', message: `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully.` };
  res.redirect('/owner/offers');
});

const deleteOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findOneAndDelete({ _id: req.params.id, owner: req.currentUser._id });
  if (!offer) {
    throw new AppError('Offer not found.', 404);
  }

  req.session.flash = { type: 'success', message: 'Offer deleted successfully.' };
  res.redirect('/owner/offers');
});

const showManageSlots = asyncHandler(async (req, res) => {
  const venue = await Venue.findOne({ _id: req.params.id, owner: req.currentUser._id });
  if (!venue) {
    throw new AppError('Venue not found.', 404);
  }

  const selectedDate = req.query.date || new Date().toISOString().slice(0, 10);
  const normalizedDate = normalizeDate(selectedDate);
  const dailySlots = generateDailySlots(venue);
  const now = new Date();

  const blockedSlots = venue.blockedSlots
    .filter((item) => {
      const sameDate = normalizeDate(item.date).getTime() === normalizedDate.getTime();
      const active = !item.autoUnblockAt || new Date(item.autoUnblockAt).getTime() > now.getTime();
      return sameDate && active;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const bookedSlots = await Booking.find({
    venue: venue._id,
    bookingDate: normalizedDate,
    slotLocked: true
  })
    .select('slotStartTime slotEndTime bookingCode')
    .sort({ slotStartTime: 1 });

  const blockedTimes = new Set(blockedSlots.map((slot) => slot.startTime));
  const bookedTimes = new Set(bookedSlots.map((slot) => slot.slotStartTime));
  const slotStatusList = dailySlots.map((slot) => ({
    ...slot,
    status: blockedTimes.has(slot.startTime) ? 'blocked' : bookedTimes.has(slot.startTime) ? 'booked' : 'available'
  }));

  res.render('pages/dashboard/owner-manage-slots', {
    title: 'Manage Blocked Slots',
    venue,
    selectedDate,
    dailySlots,
    slotStatusList,
    blockedSlots,
    bookedSlots,
    formatDate
  });
});

const addBlockedSlot = asyncHandler(async (req, res) => {
  const venue = await Venue.findOne({ _id: req.params.id, owner: req.currentUser._id });
  if (!venue) {
    throw new AppError('Venue not found.', 404);
  }

  const normalizedDate = normalizeDate(req.body.date);
  const exists = venue.blockedSlots.some(
    (item) => normalizeDate(item.date).getTime() === normalizedDate.getTime() && item.startTime === req.body.startTime
  );

  if (exists) {
    throw new AppError('This slot is already blocked on selected date.', 409);
  }

  const booked = await Booking.findOne({
    venue: venue._id,
    bookingDate: normalizedDate,
    slotStartTime: req.body.startTime,
    slotLocked: true
  });

  if (booked) {
    throw new AppError('This slot is already booked by a user. You cannot block it.', 409);
  }

  venue.blockedSlots.push({
    date: normalizedDate,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    reason: req.body.reason || 'Blocked by owner',
    autoUnblockAt: req.body.autoUnblockAt ? new Date(req.body.autoUnblockAt) : undefined
  });
  await venue.save();

  req.session.flash = { type: 'success', message: `Slot ${req.body.startTime} - ${req.body.endTime} blocked successfully.` };
  res.redirect(`/owner/venues/${venue._id}/slots?date=${req.body.date}`);
});

const removeBlockedSlot = asyncHandler(async (req, res) => {
  const venue = await Venue.findOne({ _id: req.params.id, owner: req.currentUser._id });
  if (!venue) {
    throw new AppError('Venue not found.', 404);
  }

  const selectedDate = req.body.date;
  const normalizedDate = normalizeDate(selectedDate);
  const previousLength = venue.blockedSlots.length;

  venue.blockedSlots = venue.blockedSlots.filter(
    (item) => !(normalizeDate(item.date).getTime() === normalizedDate.getTime() && item.startTime === req.body.startTime)
  );

  if (venue.blockedSlots.length === previousLength) {
    throw new AppError('Blocked slot not found.', 404);
  }

  await venue.save();
  req.session.flash = { type: 'success', message: `Blocked slot ${req.body.startTime} removed.` };
  res.redirect(`/owner/venues/${venue._id}/slots?date=${selectedDate}`);
});

module.exports = {
  createVenueValidators,
  updateVenueValidators,
  offerValidators,
  blockSlotValidators,
  home,
  listVenues,
  showVenue,
  showOwnerVenues,
  showCreateVenue,
  showEditVenue,
  createVenue,
  updateVenue,
  showOwnerOffers,
  createOffer,
  toggleOfferStatus,
  deleteOffer,
  showManageSlots,
  addBlockedSlot,
  removeBlockedSlot
};