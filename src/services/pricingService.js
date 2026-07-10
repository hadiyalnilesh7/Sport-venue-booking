const { isSaturday, isSunday } = require('date-fns');
const Offer = require('../models/Offer');
const env = require('../config/env');
const { normalizeDate } = require('../utils/time');

const normalizeSportType = (sportType = '') => String(sportType).trim().toLowerCase();

const resolveSportPricing = (venue, sportType = '') => {
  const defaultPricing = {
    sportType: sportType || '',
    weekdayPrice: Number(venue.pricing.weekdayPrice) || 0,
    saturdayPrice: Number(venue.pricing.saturdayPrice) || 0,
    sundayPrice: Number(venue.pricing.sundayPrice) || 0
  };

  const normalizedSportType = normalizeSportType(sportType);
  if (!normalizedSportType) {
    return defaultPricing;
  }

  const sportSpecificPricing = (venue.pricing.sportPricing || []).find(
    (item) => normalizeSportType(item.sportType) === normalizedSportType
  );

  if (!sportSpecificPricing) {
    return defaultPricing;
  }

  return {
    sportType: sportSpecificPricing.sportType,
    weekdayPrice: Number(sportSpecificPricing.weekdayPrice) || defaultPricing.weekdayPrice,
    saturdayPrice: Number(sportSpecificPricing.saturdayPrice) || defaultPricing.saturdayPrice,
    sundayPrice: Number(sportSpecificPricing.sundayPrice) || defaultPricing.sundayPrice
  };
};

const getVenueStartingPrice = (venue) => {
  const prices = [
    Number(venue.pricing.weekdayPrice),
    Number(venue.pricing.saturdayPrice),
    Number(venue.pricing.sundayPrice)
  ];

  (venue.pricing.sportPricing || []).forEach((item) => {
    prices.push(Number(item.weekdayPrice), Number(item.saturdayPrice), Number(item.sundayPrice));
  });

  const validPrices = prices.filter((value) => Number.isFinite(value) && value > 0);
  return validPrices.length ? Math.min(...validPrices) : 0;
};

const getBaseVenuePrice = (venue, bookingDate, sportType = '') => {
  const normalizedDate = normalizeDate(bookingDate);
  const sportPricing = resolveSportPricing(venue, sportType);

  if (isSunday(normalizedDate)) {
    return sportPricing.sundayPrice;
  }

  if (isSaturday(normalizedDate)) {
    return sportPricing.saturdayPrice;
  }

  return sportPricing.weekdayPrice;
};

const isOfferApplicable = (offer, bookingDate) => {
  const normalizedDate = normalizeDate(bookingDate);
  const startTime = normalizedDate.getTime();
  const inRange = startTime >= normalizeDate(offer.startDate).getTime() && startTime <= normalizeDate(offer.endDate).getTime();

  if (!inRange) {
    return false;
  }

  if (offer.appliesOn === 'everyday') {
    return true;
  }

  if (offer.appliesOn === 'saturday') {
    return isSaturday(normalizedDate);
  }

  if (offer.appliesOn === 'sunday') {
    return isSunday(normalizedDate);
  }

  return !isSaturday(normalizedDate) && !isSunday(normalizedDate);
};

const getBestOffer = async ({ venueId, bookingDate, couponCode }) => {
  const offers = await Offer.find({ venue: venueId, isActive: true });
  const applicableOffers = offers.filter((offer) => {
    if (!isOfferApplicable(offer, bookingDate)) {
      return false;
    }

    if (couponCode) {
      return offer.code === couponCode.toUpperCase();
    }

    return !offer.code;
  });

  return applicableOffers[0] || null;
};

const buildPricingBreakdown = async ({ venue, bookingDate, couponCode, sportType = '' }) => {
  const basePrice = getBaseVenuePrice(venue, bookingDate, sportType);
  const bestOffer = await getBestOffer({ venueId: venue._id, bookingDate, couponCode });
  let discountAmount = 0;

  if (bestOffer) {
    discountAmount =
      bestOffer.discountType === 'percentage'
        ? Math.round((basePrice * bestOffer.discountValue) / 100)
        : bestOffer.discountValue;
  }

  const totalPrice = Math.max(basePrice - discountAmount, 0);
  const advancePercent = venue.pricing.advancePercentage || env.bookingAdvancePercent;
  const bookingAmount = Math.max(Math.round((totalPrice * advancePercent) / 100), 1);
  const remainingAmount = Math.max(totalPrice - bookingAmount, 0);

  return {
    basePrice,
    discountAmount,
    totalPrice,
    bookingAmount,
    remainingAmount,
    appliedOfferLabel: bestOffer ? bestOffer.title : '',
    appliedCouponCode: bestOffer && bestOffer.code ? bestOffer.code : ''
  };
};

module.exports = {
  resolveSportPricing,
  getVenueStartingPrice,
  getBaseVenuePrice,
  buildPricingBreakdown
};