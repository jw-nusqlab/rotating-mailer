// src/services/mailer.service.js
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const storage = require('../repositories/storage');
const templateService = require('./template.service');
const oauth2Service = require('./oauth2.service');
const logger = require('../config/logger');
const {
  SEND_DELAY_MS,
  MAX_RETRIES_PER_EMAIL,
  ACCOUNT_FAILURE_LIMIT,
  ACCOUNT_DISABLE_MINUTES
} = require('../config');

const transports = new Map();

async function ensureValidAccessTokenForAccount(account) {
  if (account.authType !== 'oauth2') return account;
  const auth = account.auth || {};
  const expiresAt = auth.expires ? new Date(auth.expires) : null;
  const needsRefresh = !auth.accessToken || (expiresAt && expiresAt.getTime() - Date.now() < 60_000);
  if (!needsRefresh) return account;
  if (!auth.refreshToken || !auth.clientId || !auth.clientSecret) return account;
  const refreshed = await oauth2Service.refreshAccessToken({
    refreshToken: auth.refreshToken,
    overrides: {
      clientId: auth.clientId,
      clientSecret: auth.clientSecret,
      redirectUri: auth.redirectUri
    }
  });
  account.auth = {
    ...auth,
    accessToken: refreshed.access_token || refreshed.accessToken,
    expires: refreshed.expiry_date ? new Date(refreshed.expiry_date) : auth.expires
  };
  try {
    // Persist on main Accounts collection too
    const storageRepo = require('../repositories/storage');
    await storageRepo.updateAccount(account.email, { auth: account.auth });
  } catch (_) {}
  return account;
}

function buildTransportOptionsForAccount(acc) {
  const base = {
    host: acc.host,
    port: acc.port,
    secure: acc.secure
  };
  const looksLikeOAuth2 = acc.authType === 'oauth2' || (acc.auth && (acc.auth.clientId || acc.auth.refreshToken));
  if (looksLikeOAuth2) {
    acc.authType = 'oauth2';
    base.auth = {
      type: 'OAuth2',
      user: acc.email,
      clientId: acc.auth.clientId,
      clientSecret: acc.auth.clientSecret,
      refreshToken: acc.auth.refreshToken,
      accessToken: acc.auth.accessToken
    };
  } else {
    const user = acc.auth && acc.auth.user ? acc.auth.user : acc.email;
    base.auth = { user, pass: acc.auth ? acc.auth.pass : undefined }; // PLAIN auth
  }
  return base;
}

function getTransportForAccount(acc) {
  const cacheKey = acc.authType === 'oauth2'
    ? `${acc.email}:oauth2:${acc.auth && acc.auth.accessToken ? acc.auth.accessToken : 'noat'}`
    : `${acc.email}:password`;
  const existing = transports.get(cacheKey);
  if (existing) return existing;
  const transporter = nodemailer.createTransport(buildTransportOptionsForAccount(acc));
  transports.set(cacheKey, transporter);
  return transporter;
}

async function _sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = {
  processSendEmailJob: async function (data) {
    // data: { campaignId, to }
    const { campaignId, to } = data;
    const campaign = await storage.getCampaignById(campaignId);
    if (!campaign) {
      logger.debug('Campaign not found', { campaignId });
      return;
    }
    // Identify recipient in campaign and short-circuit if already sent
    const recipientIndex = (campaign.recipients || []).findIndex(r => r.to === to);
    if (recipientIndex === -1) {
      logger.debug('Recipient not found in campaign', { campaignId, to });
      return;
    }
    const recipientEntryRef = campaign.recipients[recipientIndex];
    if (recipientEntryRef.sent) {
      logger.debug('Recipient already sent, skipping', { campaignId, to });
      return;
    }
    // ensure recipients still exist in campaign (may be removed if retried many times)
    // pick account with rotation logic
    const accounts = campaign.accounts || [];
    if (accounts.length === 0) {
      logger.debug('No accounts snapshot in campaign', { campaignId });
      return;
    }

    // find next usable account
    let pickedIndex = -1;
    const totalAccounts = accounts.length;
    let tries = 0;

    while (tries < totalAccounts) {
      const idx = campaign.pointer % totalAccounts;
      const acc = accounts[idx];
      // check disabled
      if (acc.disabledUntil && new Date(acc.disabledUntil) > new Date()) {
        campaign.pointer = (campaign.pointer + 1) % totalAccounts;
        tries++;
        continue;
      }
      if (acc.remaining > 0) {
        pickedIndex = idx;
        break;
      } else {
        campaign.pointer = (campaign.pointer + 1) % totalAccounts;
        tries++;
      }
    }

    // if none picked -> reset remaining = maxPerCycle and pick pointer 0
    if (pickedIndex === -1) {
      accounts.forEach(a => (a.remaining = a.maxPerCycle));
      campaign.pointer = 0;
      pickedIndex = 0;
    }

    let account = accounts[pickedIndex];

     account = await ensureValidAccessTokenForAccount(account);

    // render template
    const { BASE_URL, SECRET_KEY } = require('../config');
    // Inject tracking pixel and wrap links
    const rendered = templateService.render(campaign.template, { ...campaign.globalData, to });
    const openPixel = `<img src="${BASE_URL}/api/campaigns/${campaignId}/open/${encodeURIComponent(to)}.gif" width="1" height="1" style="display:block" alt=""/>`;
    // safer link rewrite: only http(s), skip javascript/mailto
    const rewritten = rendered.replace(/href=(["\'])\s*([^"\']+)\1/gi, (match, quote, url) => {
      try {
        const trimmed = (url || '').trim();
        if (!/^https?:\/\//i.test(trimmed)) {
          return match; // skip non-http(s)
        }
        const sig = crypto.createHmac('sha256', SECRET_KEY).update(`${campaignId}|${trimmed}|${to}`).digest('hex');
        const trackUrl = `${BASE_URL}/api/campaigns/${campaignId}/click?url=${encodeURIComponent(trimmed)}&to=${encodeURIComponent(to)}&sig=${sig}`;
        return `href=${quote}${trackUrl}${quote}`;
      } catch (_) {
        return match;
      }
    });
    const html = `${rewritten}\n${openPixel}`;

    const mailOptions = {
      from: account.email,
      to,
      subject: campaign.subject,
      html,
 
    };

    try {
      const transporter = getTransportForAccount(account);
      await transporter.sendMail(mailOptions);
      // success: decrement remaining, reset failCount
      account.remaining = (account.remaining || account.maxPerCycle) - 1;
      account.failCount = 0;
      campaign.pointer = (pickedIndex + 1) % totalAccounts;
      // mark recipient as sent and persist
      campaign.recipients[recipientIndex].sent = true;
      campaign.recipients[recipientIndex].lastError = null;
      await storage.updateCampaign(campaignId, { accounts: accounts, pointer: campaign.pointer, recipients: campaign.recipients });
      logger.info(`Email sent: ${to} via ${account.email}`);
      await _sleep(SEND_DELAY_MS);
    } catch (err) {
      logger.error('Send failed', { campaignId, to, account: account.email, err: err.message || err });
      // mark failure
      account.failCount = (account.failCount || 0) + 1;
      if (account.failCount >= ACCOUNT_FAILURE_LIMIT) {
        account.disabledUntil = new Date(Date.now() + ACCOUNT_DISABLE_MINUTES * 60 * 1000);
        account.failCount = 0;
        logger.debug('Account temporarily disabled', { account: account.email, until: account.disabledUntil });
      }
      campaign.pointer = (pickedIndex + 1) % totalAccounts;
      // increment retries for this recipient and persist
      const currentRetries = (campaign.recipients[recipientIndex].retries || 0) + 1;
      campaign.recipients[recipientIndex].retries = currentRetries;
      campaign.recipients[recipientIndex].lastError = err.message || String(err);
      await storage.updateCampaign(campaignId, { accounts: accounts, pointer: campaign.pointer, recipients: campaign.recipients });
      // Determine if error looks permanent; if so, do not retry
      const errorMessage = (err && err.message) ? err.message : String(err);
      const looksPermanent = /Missing credentials|Invalid login|EAUTH|Username and Password not accepted|ENOTFOUND|ECONNREFUSED/i.test(errorMessage);

      // requeue recipient if retry not exceeded and error not permanent
      if (!looksPermanent && currentRetries <= MAX_RETRIES_PER_EMAIL) {
        const queueService = require('./queue.service');
        const retryJobId = `${campaignId}:${to}:retry:${currentRetries}`;
        await queueService.addJob('send-email', { campaignId, to }, { delay: 5000, jobId: retryJobId });
        logger.debug('Requeued recipient for retry', { to, campaignId, retries: currentRetries });
      } else {
        logger.debug('Will not retry recipient', { to, campaignId, reason: looksPermanent ? 'permanent-error' : 'max-retries' });
      }
    }
  }
};
