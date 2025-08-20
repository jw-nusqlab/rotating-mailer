// src/routes/status.js
const express = require('express');
const router = express.Router();
const queueService = require('../services/queue.service');

router.get('/', async (req, res) => {
  const status = await queueService.status();
  res.send(status);
});

module.exports = router;
