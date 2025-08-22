// src/routes/campaigns.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/campaign.controller');
const validateBody = require('../middlewares/validateBody');
const Joi = require('joi');

const sendSchema = Joi.object({
  recipients: Joi.array().items(Joi.string().email()).min(1).required(),
  subject: Joi.string().required(),
  template: Joi.string().required(),
  globalData: Joi.object().optional()
});

router.post('/send', validateBody(sendSchema), controller.sendCampaign);
router.get('/', controller.listCampaigns);
router.delete('/:id', controller.deleteCampaign);
// tracking
router.get('/:id/open/:to.gif', controller.trackOpen);
router.get('/:id/click', controller.trackClick);
// batch pump (cron-friendly)
router.post('/:id/pump', controller.pumpCampaign);

module.exports = router;
