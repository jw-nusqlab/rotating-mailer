// src/models/Account.model.js
const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  host: { type: String, default: 'smtp.gmail.com' },
  port: { type: Number, default: 587 },
  secure: { type: Boolean, default: false },
  // authType indicates how to authenticate when sending mail
  authType: { type: String, enum: ['password', 'oauth2'], default: 'password' },
  // For flexibility across providers, keep a mixed auth payload
  // password auth: { user, pass }
  // oauth2 auth: { clientId, clientSecret, refreshToken, accessToken?, expires? }
  auth: { type: mongoose.Schema.Types.Mixed, required: true },
  maxPerCycle: { type: Number, default: 100 },
  failCount: { type: Number, default: 0 },
  disabledUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'accounts' });

module.exports = mongoose.model('Account', AccountSchema);
