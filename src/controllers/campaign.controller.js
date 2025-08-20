// src/controllers/campaign.controller.js
const storage = require('../repositories/storage');
const queueService = require('../services/queue.service');
const { v4: uuidv4 } = require('uuid');

exports.sendCampaign = async (req, res) => {
  const { recipients, subject, template, globalData } = req.body;
  // snapshot accounts from DB
  const accounts = await storage.getAccounts();
  if (!accounts || accounts.length === 0) return res.status(400).send({ error: 'No sending accounts configured' });
  // Keep only accounts with valid credentials
  const validAccounts = accounts.filter(a => {
    const authType = a.authType || (a.auth && a.auth.pass ? 'password' : 'oauth2');
    if (authType === 'oauth2') {
      return !!(a.auth && a.auth.clientId && a.auth.clientSecret && a.auth.refreshToken);
    }
    return !!(a.auth && (a.auth.pass || a.pass));
  });
  if (validAccounts.length === 0) {
    return res.status(400).send({ error: 'No valid sending accounts. Check credentials for accounts.' });
  }

  const campaignId = uuidv4();
  // dedupe recipients
  const uniqueRecipients = Array.from(new Set((recipients || []).map(r => r.trim().toLowerCase())));

  const campaign = {
    id: campaignId,
    recipients: uniqueRecipients.map(r => ({ to: r, retries: 0, sent: false })),
    subject,
    template,
    globalData: globalData || {},
    accounts: validAccounts.map(a => ({
      email: a.email,
      host: a.host,
      port: a.port,
      secure: a.secure,
      authType: a.authType || (a.auth && a.auth.pass ? 'password' : 'oauth2'),
      auth: a.auth,
      maxPerCycle: a.maxPerCycle || 100,
      remaining: a.maxPerCycle || 100,
      failCount: a.failCount || 0,
      disabledUntil: a.disabledUntil || null
    })),
    createdAt: new Date(),
    pointer: 0
  };

  await storage.addCampaign(campaign);

  // enqueue individual recipient jobs to queue
  for (const r of campaign.recipients) {
    // unique jobId per recipient to avoid duplicate enqueues
    await queueService.addJob('send-email', { campaignId: campaign.id, to: r.to }, { jobId: `${campaign.id}:${r.to}` });
  }

  return res.status(201).send({ ok: true, campaignId: campaign.id });
};

exports.listCampaigns = async (req, res) => {
  const campaigns = await storage.getCampaigns();
  res.send(campaigns);
};

// Tracking endpoints
exports.trackOpen = async (req, res) => {
  const { id } = req.params;
  const rawTo = req.params.to || '';
  const to = decodeURIComponent(rawTo).toLowerCase();
  const campaign = await storage.getCampaignById(id);
  if (campaign) {
    campaign.opens = (campaign.opens || 0) + 1;
    // mark recipient opened if exists
    const idx = (campaign.recipients || []).findIndex(r => (r.to || '').toLowerCase() === to);
    if (idx >= 0) {
      campaign.recipients[idx].openedAt = new Date();
    }
    await storage.updateCampaign(id, { opens: campaign.opens, recipients: campaign.recipients });
  }
  // 1x1 transparent gif
  const gif = Buffer.from('R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
  res.set('Content-Type', 'image/gif');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(gif);
};

exports.trackClick = async (req, res) => {
  const { id } = req.params;
  const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
  const rawTo = typeof req.query.to === 'string' ? req.query.to : '';
  if (!rawUrl) return res.status(400).send('Missing url');
  const to = decodeURIComponent(rawTo).toLowerCase();
  const url = decodeURIComponent(rawUrl);
  const campaign = await storage.getCampaignById(id);
  if (campaign) {
    campaign.clicks = (campaign.clicks || 0) + 1;
    const idx = (campaign.recipients || []).findIndex(r => (r.to || '').toLowerCase() === to);
    if (idx >= 0) {
      campaign.recipients[idx].lastClickedAt = new Date();
    }
    await storage.updateCampaign(id, { clicks: campaign.clicks, recipients: campaign.recipients });
  }
  // redirect
  res.redirect(url);
};
