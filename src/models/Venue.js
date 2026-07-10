const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const blockedSlotSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    reason: String,
    autoUnblockAt: Date
  },
  { _id: false }
);

const sportPricingSchema = new mongoose.Schema(
  {
    sportType: {
      type: String,
      required: true,
      trim: true
    },
    weekdayPrice: {
      type: Number,
      required: true
    },
    saturdayPrice: {
      type: Number,
      required: true
    },
    sundayPrice: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const venueSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true
    },
    sportTypes: {
      type: [String],
      required: true,
      default: []
    },
    location: {
      city: { type: String, required: true, trim: true },
      area: { type: String, trim: true },
      address: { type: String, required: true, trim: true },
      mapLink: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    description: {
      type: String,
      required: true
    },
    amenities: {
      type: [String],
      default: []
    },
    openingTime: {
      type: String,
      required: true
    },
    closingTime: {
      type: String,
      required: true
    },
    slotDurationMinutes: {
      type: Number,
      default: 120
    },
    pricing: {
      baseTwoHourPrice: { type: Number, required: true },
      weekdayPrice: { type: Number, required: true },
      saturdayPrice: { type: Number, required: true },
      sundayPrice: { type: Number, required: true },
      sportPricing: {
        type: [sportPricingSchema],
        default: []
      },
      advancePercentage: { type: Number, default: 25 }
    },
    photos: {
      type: [String],
      default: []
    },
    blockedSlots: {
      type: [blockedSlotSchema],
      default: []
    },
    ratingAverage: {
      type: Number,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'inactive'],
      default: 'draft'
    }
  },
  {
    timestamps: true
  }
);

venueSchema.pre('validate', function preValidate(next) {
  if (!this.slug && this.name) {
    this.slug = `${slugify(this.name)}-${Date.now().toString().slice(-5)}`;
  }

  next();
});

module.exports = mongoose.model('Venue', venueSchema);