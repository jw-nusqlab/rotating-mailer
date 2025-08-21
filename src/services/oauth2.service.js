// src/services/oauth2.service.js
const { google } = require('googleapis');
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_CALLBACK_URL } = require('../config');

function createOAuthClient(overrides = {}) {
  const clientId = overrides.clientId || GOOGLE_CLIENT_ID;
  const clientSecret = overrides.clientSecret || GOOGLE_CLIENT_SECRET;
  const redirectUri = overrides.redirectUri || GOOGLE_OAUTH_CALLBACK_URL;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth configuration missing');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

module.exports = {
  getAuthUrl: ({ state, scopes, overrides } = {}) => {
    // ignore overrides to force using env config
    const oauth2Client = createOAuthClient();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      // Using full Gmail scope improves XOAUTH2 SMTP compatibility in some cases
      scope: ['https://mail.google.com/'],
      state
    });
    return url;
  },

  exchangeCodeForTokens: async ({ code, overrides } = {}) => {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens; // { access_token, refresh_token, expiry_date, ... }
  },

  refreshAccessToken: async ({ refreshToken, overrides } = {}) => {
    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials; // { access_token, expiry_date, ... }
  }
};


