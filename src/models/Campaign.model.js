// src/models/Campaign.model.js
const mongoose = require('mongoose');

const RecipientSub = new mongoose.Schema({
  to: String,
  retries: { type: Number, default: 0 },
  sent: { type: Boolean, default: false },
  failed: { type: Boolean, default: false },
  lastError: { type: String, default: null },
  openedAt: { type: Date, default: null },
  lastClickedAt: { type: Date, default: null }
}, { _id: false });

const CampaignSchema = new mongoose.Schema({
  id: { type: String, required: true, index: true, unique: true },
  recipients: { type: [RecipientSub], default: [] },
  subject: String,
  template: String,
  globalData: mongoose.Schema.Types.Mixed,
  accounts: { type: [mongoose.Schema.Types.Mixed], default: [] },
  pointer: { type: Number, default: 0 },
  status: { type: String, enum: ['ongoing', 'completed'], default: 'ongoing' },
  totalCount: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  completedAt: { type: Date, default: null },
  opens: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'campaigns' });

module.exports = mongoose.model('Campaign', CampaignSchema);
