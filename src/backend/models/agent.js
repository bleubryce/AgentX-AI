const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  config: {
    model: { type: String, required: true },
    temperature: { type: Number, required: true },
    max_tokens: { type: Number, required: true },
    system_prompt: { type: String, required: true },
    allowed_features: [{ type: String, required: true }]
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

agentSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Ensure unique agent names per user
agentSchema.index({ user_id: 1, name: 1 }, { unique: true });

agentSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Agent = mongoose.model('Agent', agentSchema);

module.exports = Agent; 