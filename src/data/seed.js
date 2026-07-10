const { connectDatabase } = require('../config/db');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Offer = require('../models/Offer');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const WalletTransaction = require('../models/WalletTransaction');
const { ROLES } = require('../constants/roles');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../constants/booking');

const seed = async () => {
  await connectDatabase();

  await Promise.all([
    User.deleteMany({}),
    Venue.deleteMany({}),
    Offer.deleteMany({}),
    Review.deleteMany({}),
    Booking.deleteMany({}),
    WalletTransaction.deleteMany({})
  ]);

  const [admin, ...seedAccounts] = await User.create([
    {
      fullName: 'Platform Admin',
      email: 'admin@sportbook.com',
      phone: '01700000001',
      password: 'password123',
      role: ROLES.ADMIN,
      isApproved: true,
      isVerified: true
    },
    {
      fullName: 'Arena Owner One',
      email: 'owner1@sportbook.com',
      phone: '01700000002',
      password: 'password123',
      role: ROLES.OWNER,
      paymentDetails: {
        accountHolderName: 'Arena Owner One',
        upiId: 'owner1@upi',
        qrCodeImage: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=owner1@upi'
      },
      isApproved: true,
      isVerified: true
    },
    {
      fullName: 'Arena Owner Two',
      phone: '01700000003',
      email: 'owner2@sportbook.com',
      password: 'password123',
      role: ROLES.OWNER,
      paymentDetails: {
        accountHolderName: 'Arena Owner Two',
        upiId: 'owner2@upi',
        qrCodeImage: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=owner2@upi'
      },
      isApproved: true,
      isVerified: true
    },
    {
      fullName: 'Arena Owner Three',
      phone: '01700000004',
      email: 'owner3@sportbook.com',
      password: 'password123',
      role: ROLES.OWNER,
      paymentDetails: {
        accountHolderName: 'Arena Owner Three',
        upiId: 'owner3@upi',
        qrCodeImage: 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=owner3@upi'
      },
      isApproved: true,
      isVerified: true
    },
    {
      fullName: 'Regular User One',
      email: 'user1@sportbook.com',
      phone: '01700000005',
      password: 'password123',
      role: ROLES.USER,
      isApproved: true,
      isVerified: true
    },
    {
      fullName: 'Regular User Two',
      email: 'user2@sportbook.com',
      phone: '01700000006',
      password: 'password123',
      role: ROLES.USER,
      isApproved: true,
      isVerified: true
    },
    {
      fullName: 'Regular User Three',
      email: 'user3@sportbook.com',
      phone: '01700000007',
      password: 'password123',
      role: ROLES.USER,
      isApproved: true,
      isVerified: true
    }
  ]);

  const owners = seedAccounts.filter((account) => account.role === ROLES.OWNER);
  const users = seedAccounts.filter((account) => account.role === ROLES.USER);

  const ahmedabadAreas = ['Navrangpura', 'Satellite', 'Bopal', 'Maninagar', 'Bodakdev', 'Naranpura', 'Vastrapur', 'Gota', 'Thaltej'];
  const venueBlueprints = [
    {
      nameSuffix: 'Turf Arena',
      sportTypes: ['Football', 'Futsal', 'Box Cricket'],
      description: 'Premium multi-sport turf with floodlights and changing facilities.',
      amenities: ['Parking', 'Floodlights', 'Changing Room', 'Drinking Water'],
      openingTime: '07:00',
      closingTime: '23:00',
      slotDurationMinutes: 120,
      pricing: {
        baseTwoHourPrice: 2200,
        weekdayPrice: 2200,
        saturdayPrice: 2500,
        sundayPrice: 2600,
        sportPricing: [
          {
            sportType: 'Football',
            weekdayPrice: 2200,
            saturdayPrice: 2500,
            sundayPrice: 2600
          },
          {
            sportType: 'Futsal',
            weekdayPrice: 1900,
            saturdayPrice: 2200,
            sundayPrice: 2300
          },
          {
            sportType: 'Box Cricket',
            weekdayPrice: 2400,
            saturdayPrice: 2700,
            sundayPrice: 2800
          }
        ],
        advancePercentage: 25
      },
      photo: 'https://images.unsplash.com/photo-1486286701208-1d58e9338013?auto=format&fit=crop&w=1000&q=80'
    },
    {
      nameSuffix: 'Smash Court',
      sportTypes: ['Badminton', 'Table Tennis', 'Pickleball'],
      description: 'Indoor multi-court arena for badminton, table tennis, and pickleball.',
      amenities: ['Indoor Court', 'Washroom', 'Equipment Rental', 'Locker Room'],
      openingTime: '06:00',
      closingTime: '22:00',
      slotDurationMinutes: 120,
      pricing: {
        baseTwoHourPrice: 1600,
        weekdayPrice: 1600,
        saturdayPrice: 1850,
        sundayPrice: 1950,
        sportPricing: [
          {
            sportType: 'Badminton',
            weekdayPrice: 1600,
            saturdayPrice: 1850,
            sundayPrice: 1950
          },
          {
            sportType: 'Table Tennis',
            weekdayPrice: 1200,
            saturdayPrice: 1450,
            sundayPrice: 1550
          },
          {
            sportType: 'Pickleball',
            weekdayPrice: 1400,
            saturdayPrice: 1650,
            sundayPrice: 1750
          }
        ],
        advancePercentage: 30
      },
      photo: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1000&q=80'
    },
    {
      nameSuffix: 'Cricket Box',
      sportTypes: ['Cricket', 'Volleyball', 'Basketball'],
      description: 'Well-maintained multi-sport court with cricket nets and flexible layout.',
      amenities: ['Net Practice', 'Seating', 'Lighting', 'Drinking Water'],
      openingTime: '08:00',
      closingTime: '22:00',
      slotDurationMinutes: 120,
      pricing: {
        baseTwoHourPrice: 2400,
        weekdayPrice: 2400,
        saturdayPrice: 2700,
        sundayPrice: 2800,
        sportPricing: [
          {
            sportType: 'Cricket',
            weekdayPrice: 2400,
            saturdayPrice: 2700,
            sundayPrice: 2800
          },
          {
            sportType: 'Volleyball',
            weekdayPrice: 1700,
            saturdayPrice: 1950,
            sundayPrice: 2050
          },
          {
            sportType: 'Basketball',
            weekdayPrice: 1800,
            saturdayPrice: 2100,
            sundayPrice: 2200
          }
        ],
        advancePercentage: 25
      },
      photo: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1000&q=80'
    },
    {
      nameSuffix: 'Racket Club',
      sportTypes: ['Tennis', 'Badminton', 'Pickleball'],
      description: 'Outdoor and semi-indoor racket courts with evening lights.',
      amenities: ['Floodlights', 'Washroom', 'Equipment Rental', 'Parking'],
      openingTime: '06:00',
      closingTime: '22:00',
      slotDurationMinutes: 120,
      pricing: {
        baseTwoHourPrice: 2100,
        weekdayPrice: 2100,
        saturdayPrice: 2350,
        sundayPrice: 2450,
        sportPricing: [
          {
            sportType: 'Tennis',
            weekdayPrice: 2100,
            saturdayPrice: 2350,
            sundayPrice: 2450
          },
          {
            sportType: 'Badminton',
            weekdayPrice: 1500,
            saturdayPrice: 1750,
            sundayPrice: 1850
          },
          {
            sportType: 'Pickleball',
            weekdayPrice: 1700,
            saturdayPrice: 1950,
            sundayPrice: 2050
          }
        ],
        advancePercentage: 25
      },
      photo: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1000&q=80'
    },
    {
      nameSuffix: 'Indoor Sports Hub',
      sportTypes: ['Futsal', 'Basketball', 'Volleyball'],
      description: 'Indoor multi-sport complex for team games and practice sessions.',
      amenities: ['Indoor Court', 'Seating', 'Locker Room', 'Drinking Water'],
      openingTime: '07:00',
      closingTime: '23:00',
      slotDurationMinutes: 120,
      pricing: {
        baseTwoHourPrice: 2600,
        weekdayPrice: 2600,
        saturdayPrice: 2900,
        sundayPrice: 3000,
        sportPricing: [
          {
            sportType: 'Futsal',
            weekdayPrice: 2600,
            saturdayPrice: 2900,
            sundayPrice: 3000
          },
          {
            sportType: 'Basketball',
            weekdayPrice: 1900,
            saturdayPrice: 2200,
            sundayPrice: 2300
          },
          {
            sportType: 'Volleyball',
            weekdayPrice: 1750,
            saturdayPrice: 2050,
            sundayPrice: 2150
          }
        ],
        advancePercentage: 30
      },
      photo: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1000&q=80'
    },
    {
      nameSuffix: 'Play Arena',
      sportTypes: ['Box Cricket', 'Football', 'Badminton'],
      description: 'Flexible sports arena suitable for cricket box, football, and badminton.',
      amenities: ['Parking', 'Floodlights', 'Changing Room', 'Cafeteria'],
      openingTime: '08:00',
      closingTime: '23:00',
      slotDurationMinutes: 120,
      pricing: {
        baseTwoHourPrice: 2300,
        weekdayPrice: 2300,
        saturdayPrice: 2550,
        sundayPrice: 2650,
        sportPricing: [
          {
            sportType: 'Box Cricket',
            weekdayPrice: 2300,
            saturdayPrice: 2550,
            sundayPrice: 2650
          },
          {
            sportType: 'Football',
            weekdayPrice: 2100,
            saturdayPrice: 2350,
            sundayPrice: 2450
          },
          {
            sportType: 'Badminton',
            weekdayPrice: 1500,
            saturdayPrice: 1750,
            sundayPrice: 1850
          }
        ],
        advancePercentage: 25
      },
      photo: 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?auto=format&fit=crop&w=1000&q=80'
    }
  ];

  const venuePayloads = owners.flatMap((ownerItem, ownerIndex) => (
    venueBlueprints.map((blueprint, venueIndex) => {
      const area = ahmedabadAreas[(ownerIndex * venueBlueprints.length + venueIndex) % ahmedabadAreas.length];
      return {
        owner: ownerItem._id,
        name: `${ownerItem.fullName.split(' ')[2]} ${blueprint.nameSuffix}`,
        sportTypes: blueprint.sportTypes,
        location: {
          city: 'Ahmedabad',
          area,
          address: `${area}, Ahmedabad, Gujarat`,
          mapLink: 'https://maps.google.com'
        },
        description: blueprint.description,
        amenities: blueprint.amenities,
        openingTime: blueprint.openingTime,
        closingTime: blueprint.closingTime,
        slotDurationMinutes: blueprint.slotDurationMinutes,
        pricing: blueprint.pricing,
        photos: [blueprint.photo],
        isApproved: true,
        isFeatured: ownerIndex === 0 && venueIndex === 0,
        status: 'active'
      };
    })
  ));

  const venues = await Venue.create(venuePayloads);

  await Offer.create({
    venue: venues[0]._id,
    owner: owners[0]._id,
    title: 'Weekday Launch Offer',
    discountType: 'percentage',
    discountValue: 10,
    appliesOn: 'weekday',
    startDate: new Date(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    isActive: true
  });

  const completedBookingDate = new Date(Date.now() - 1000 * 60 * 60 * 24);
  completedBookingDate.setHours(0, 0, 0, 0);

  const completedBooking = await Booking.create({
    user: users[0]._id,
    owner: owners[0]._id,
    venue: venues[0]._id,
    sportType: 'Football',
    bookingDate: completedBookingDate,
    slotStartTime: '08:00',
    slotEndTime: '10:00',
    slotKey: `${venues[0]._id}-${completedBookingDate.toISOString().slice(0, 10)}-08:00`,
    pricingBreakdown: {
      basePrice: 2000,
      discountAmount: 0,
      totalPrice: 2000,
      bookingAmount: 500,
      remainingAmount: 1500
    },
    bookingStatus: BOOKING_STATUS.COMPLETED,
    paymentStatus: PAYMENT_STATUS.FULLY_PAID,
    slotLocked: false,
    userSnapshot: {
      fullName: users[0].fullName,
      email: users[0].email,
      phone: users[0].phone
    }
  });

  await WalletTransaction.create({
    owner: owners[0]._id,
    booking: completedBooking._id,
    venue: venues[0]._id,
    amount: 500,
    type: 'advance_received',
    status: 'completed',
    note: 'Seeded advance payment'
  });

  await Review.create({
    user: users[0]._id,
    venue: venues[0]._id,
    booking: completedBooking._id,
    rating: 5,
    comment: 'Great turf quality and well-managed slots.'
  });

  console.log('Seed completed successfully.');
  console.log('Admin: admin@sportbook.com / password123');
  console.log('Owners:');
  console.log('  owner1@sportbook.com / password123');
  console.log('  owner2@sportbook.com / password123');
  console.log('  owner3@sportbook.com / password123');
  console.log('Users:');
  console.log('  user1@sportbook.com / password123');
  console.log('  user2@sportbook.com / password123');
  console.log('  user3@sportbook.com / password123');
  process.exit(0);
};

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});