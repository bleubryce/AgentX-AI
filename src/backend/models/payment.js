const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  payment_method: {
    type: String,
    required: true
  },
  transaction_id: {
    type: String,
    unique: true,
    sparse: true
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

paymentSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment; 