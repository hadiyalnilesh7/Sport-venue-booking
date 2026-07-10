const { format, parseISO, startOfDay } = require('date-fns');

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');
  return `${hours}:${mins}`;
};

const normalizeDate = (dateValue) => startOfDay(typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue));

const formatDate = (dateValue, dateFormat = 'dd MMM yyyy') => format(normalizeDate(dateValue), dateFormat);

module.exports = {
  timeToMinutes,
  minutesToTime,
  normalizeDate,
  formatDate
};