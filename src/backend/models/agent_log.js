const mongoose = require('mongoose');

const agentLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  agent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  request_id: { type: String, required: true },
  prompt: { type: String, required: true },
  response: { type: String, required: true },
  tokens_used: { type: Number, required: true },
  features: [{ type: String, required: true }],
  status: { type: String, enum: ['success', 'error', 'pending'], default: 'success', required: true },
  error_message: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

agentLogSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

const AgentLog = mongoose.model('AgentLog', agentLogSchema);

module.exports = AgentLog; 