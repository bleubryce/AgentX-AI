const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  address: String,
  city: String,
  state: String,
  zipCode: String,
  latitude: Number,
  longitude: Number
});

const BudgetSchema = new mongoose.Schema({
  min: Number,
  max: Number
});

const LeadSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please add a first name'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name'],
    trim: true
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: String,
  status: {
    type: String,
    enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST', 'INACTIVE'],
    default: 'NEW'
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  source: {
    type: String,
    enum: ['WEBSITE', 'REFERRAL', 'SOCIAL_MEDIA', 'EMAIL_CAMPAIGN', 'PHONE_INQUIRY', 'PARTNER', 'OTHER'],
    default: 'WEBSITE'
  },
  notes: String,
  tags: [String],
  location: LocationSchema,
  budget: BudgetSchema,
  propertyType: {
    type: String,
    enum: ['SINGLE_FAMILY', 'MULTI_FAMILY', 'CONDO', 'TOWNHOUSE', 'LAND', 'COMMERCIAL', 'OTHER'],
    default: 'SINGLE_FAMILY'
  },
  assignedAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastContactDate: Date,
  nextFollowUpDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// Update the updatedAt field on save
LeadSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add index for faster queries
LeadSchema.index({ status: 1, priority: -1 });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ assignedAgentId: 1 });

module.exports = mongoose.model('Lead', LeadSchema); 