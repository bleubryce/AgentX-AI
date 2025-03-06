const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan_id: { type: String, required: true },
  status: { type: String, enum: ['active', 'canceled', 'past_due'], required: true },
  stripe_subscription_id: { type: String },
  stripe_customer_id: { type: String },
  current_period_start: { type: Date },
  current_period_end: { type: Date },
  cancel_at_period_end: { type: Boolean, default: false },
  canceled_at: { type: Date },
  trial_end: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

subscriptionSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Ensure only one active subscription per user
subscriptionSchema.index(
  { user_id: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

module.exports = mongoose.model('Subscription', subscriptionSchema); 