// src/controllers/account.controller.js
const storage = require('../repositories/storage');
const logger = require('../config/logger');

exports.createAccount = async (req, res) => {
  const body = req.body;
  // default host/port for many providers if not provided
  const account = {
    email: body.email,
    host: body.host || 'smtp.gmail.com',
    port: body.port || 587,
    secure: body.secure || false,
    authType: body.authType || (body.auth && body.auth.pass ? 'password' : 'oauth2'),
    auth: body.auth,
    maxPerCycle: body.maxPerCycle || 100
  };
  const created = await storage.addAccount(account);
  logger.info('Account added', { email: created.email });
  res.status(201).send(created);
};

exports.listAccounts = async (req, res) => {
  const accounts = await storage.getAccounts();
  res.send(accounts);
};

exports.updateAccount = async (req, res) => {
  const email = req.params.email;
  const patch = req.body;
  const updated = await storage.updateAccount(email, patch);
  if (!updated) return res.status(404).send({ error: 'Account not found' });
  res.send(updated);
};

// OAuth2 authorization URL generation
exports.oauthAuthorize = async (req, res) => {
  const { email, clientId, clientSecret, redirectUri } = req.body;
  if (!email) return res.status(400).send({ error: 'email is required' });
  const oauth2 = require('../services/oauth2.service');
  const url = oauth2.getAuthUrl({
    state: encodeURIComponent(JSON.stringify({ email, clientId, clientSecret, redirectUri })),
    overrides: { clientId, clientSecret, redirectUri }
  });
  res.send({ authorizeUrl: url });
};

// OAuth2 callback: exchange code and create/update account
exports.oauthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send({ error: 'code missing' });
    const parsedState = state ? JSON.parse(decodeURIComponent(state)) : {};
    const { email, clientId, clientSecret, redirectUri } = parsedState;
    const oauth2 = require('../services/oauth2.service');
    const tokens = await oauth2.exchangeCodeForTokens({ code, overrides: { clientId, clientSecret, redirectUri } });

    const authPayload = {
      clientId,
      clientSecret,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expires: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    };

    // upsert account
    const existing = (await storage.getAccounts()).find(a => a.email === email);
    const base = {
      email,
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      authType: 'oauth2',
      auth: authPayload
    };
    let result;
    if (existing) {
      result = await storage.updateAccount(email, base);
    } else {
      result = await storage.addAccount({ ...base, maxPerCycle: 100 });
    }
    res.send({ ok: true, account: result });
  } catch (err) {
    logger.error('OAuth callback error', { err: err.message || err });
    res.status(500).send({ error: err.message || 'OAuth2 error' });
  }
};
