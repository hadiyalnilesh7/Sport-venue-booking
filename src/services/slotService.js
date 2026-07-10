const Booking = require('../models/Booking');
const { minutesToTime, normalizeDate, timeToMinutes } = require('../utils/time');

const buildSlotKey = (venueId, bookingDate, startTime) => `${venueId}-${normalizeDate(bookingDate).toISOString().slice(0, 10)}-${startTime}`;

const isToday = (dateValue) => normalizeDate(dateValue).getTime() === normalizeDate(new Date()).getTime();

const generateDailySlots = (venue) => {
  const openMinutes = timeToMinutes(venue.openingTime);
  let closeMinutes = timeToMinutes(venue.closingTime);
  const slots = [];

  // Support overnight venues such as 05:00 to 02:00.
  if (closeMinutes <= openMinutes) {
    closeMinutes += 24 * 60;
  }

  for (let cursor = openMinutes; cursor + venue.slotDurationMinutes <= closeMinutes; cursor += venue.slotDurationMinutes) {
    slots.push({
      startTime: minutesToTime(cursor % (24 * 60)),
      endTime: minutesToTime((cursor + venue.slotDurationMinutes) % (24 * 60))
    });
  }

  return slots;
};

const getAvailableSlots = async (venue, bookingDate) => {
  const normalizedDate = normalizeDate(bookingDate);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const generatedSlots = generateDailySlots(venue).filter((slot) => {
    if (!isToday(normalizedDate)) {
      return true;
    }

    return timeToMinutes(slot.startTime) > currentMinutes;
  });
  const bookings = await Booking.find({
    venue: venue._id,
    bookingDate: normalizedDate,
    slotLocked: true
  }).select('slotStartTime');

  const bookedTimes = new Set(bookings.map((item) => item.slotStartTime));
  const blockedTimes = new Set(
    venue.blockedSlots
      .filter((item) => {
        const sameDate = normalizeDate(item.date).getTime() === normalizedDate.getTime();
        const active = !item.autoUnblockAt || new Date(item.autoUnblockAt).getTime() > now.getTime();
        return sameDate && active;
      })
      .map((item) => item.startTime)
  );

  return generatedSlots.map((slot) => ({
    ...slot,
    isAvailable: !bookedTimes.has(slot.startTime) && !blockedTimes.has(slot.startTime),
    slotKey: buildSlotKey(venue._id, normalizedDate, slot.startTime)
  }));
};

module.exports = {
  buildSlotKey,
  generateDailySlots,
  getAvailableSlots
};