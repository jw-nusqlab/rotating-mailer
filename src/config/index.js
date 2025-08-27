// src/config/index.js
module.exports = {
  PORT: process.env.PORT || 8000,
  MONGO_URI: process.env.MONGODB_URI,
  REDIS_URL: process.env.REDIS_URL,
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 8000}`,
  SECRET_KEY: process.env.SECRET_KEY || 'dev-secret',
  QUEUE_MODE: process.env.QUEUE_MODE || (process.env.VERCEL ? 'inline' : 'bullmq'),
  SECRET_KEY: process.env.SECRET_KEY || process.env.JWT_SECRET || 'change-me-in-prod',
  PROCESS_BATCH_SIZE: Number(process.env.PROCESS_BATCH_SIZE || 5),
  // Google OAuth (optional, per-account client recommended)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_OAUTH_CALLBACK_URL: process.env.GOOGLE_OAUTH_CALLBACK_URL,
  // mail defaults
  SEND_DELAY_MS: Number(process.env.SEND_DELAY_MS || 300),
  MAX_RETRIES_PER_EMAIL: Number(process.env.MAX_RETRIES_PER_EMAIL || 3),
  ACCOUNT_FAILURE_LIMIT: Number(process.env.ACCOUNT_FAILURE_LIMIT || 5),
  ACCOUNT_DISABLE_MINUTES: Number(process.env.ACCOUNT_DISABLE_MINUTES || 20)
};
