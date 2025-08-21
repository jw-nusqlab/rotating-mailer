// src/routes/accounts.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/account.controller');
const validateBody = require('../middlewares/validateBody');
const Joi = require('joi');

const passwordAuthSchema = Joi.object({
  user: Joi.string().email().required(),
  pass: Joi.string().min(1).required()
});

const oauth2AuthSchema = Joi.object({
  clientId: Joi.string().required(),
  clientSecret: Joi.string().required(),
  refreshToken: Joi.string().required(),
  accessToken: Joi.string().optional(),
  expires: Joi.alternatives(Joi.date(), Joi.string()).optional(),
  redirectUri: Joi.string().uri().optional()
});

const accountSchema = Joi.object({
  email: Joi.string().email().required(),
  host: Joi.string().optional(),
  port: Joi.number().optional(),
  secure: Joi.boolean().optional(),
  authType: Joi.string().valid('password', 'oauth2').optional(),
  auth: Joi.alternatives()
    .conditional('authType', {
      is: 'oauth2',
      then: oauth2AuthSchema.required(),
      otherwise: passwordAuthSchema.required()
    }),
  maxPerCycle: Joi.number().min(1).max(10000).optional()
});

router.post('/', validateBody(accountSchema), controller.createAccount);
router.get('/', controller.listAccounts);
router.patch('/:email', controller.updateAccount);

// OAuth2 routes
const oauthAuthorizeSchema = Joi.object({
  email: Joi.string().email().required()
});

router.post('/oauth2/authorize', validateBody(oauthAuthorizeSchema), controller.oauthAuthorize);
router.get('/oauth2/callback', controller.oauthCallback);

module.exports = router;
