// src/middlewares/errorHandler.js
const logger = require('../config/logger');

module.exports = function (err, req, res, next) {
  logger.error('Unhandled error', err);
  res.status(500).send({ error: err.message || 'Internal Server Error' });
};
