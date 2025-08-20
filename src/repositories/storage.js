// src/repositories/storage.js
const mongoose = require('mongoose');
const Account = require('../models/Account.model');
const Campaign = require('../models/Campaign.model');
const { MONGO_URI } = require('../config');

let connected = false;
async function connect() {
  if (connected) return;
  await mongoose.connect(MONGO_URI);
  connected = true;
}

async function addAccount(account) {
  await connect();
  const doc = new Account(account);
  await doc.save();
  return doc.toObject();
}

async function getAccounts() {
  await connect();
  return await Account.find({}).lean();
}

async function updateAccount(email, patch) {
  await connect();
  return await Account.findOneAndUpdate({ email }, patch, { new: true }).lean();
}

async function addCampaign(campaign) {
  await connect();
  const doc = new Campaign(campaign);
  await doc.save();
  return doc.toObject();
}

async function getCampaigns() {
  await connect();
  return await Campaign.find({}).sort({ createdAt: 1 }).lean();
}

async function getCampaignById(id) {
  await connect();
  return await Campaign.findOne({ id }).lean();
}

async function updateCampaign(id, patch) {
  await connect();
  return await Campaign.findOneAndUpdate({ id }, patch, { new: true }).lean();
}

async function removeCampaign(id) {
  await connect();
  return await Campaign.deleteOne({ id });
}

module.exports = {
  connect,
  addAccount,
  getAccounts,
  updateAccount,
  addCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  removeCampaign
};
