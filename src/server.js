// src/server.js
require('express-async-errors');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./config/logger');
const accountsRoute = require('./routes/accounts');
const campaignsRoute = require('./routes/campaigns');
const statusRoute = require('./routes/status');
const errorHandler = require('./middlewares/errorHandler');
const path = require('path');

module.exports = async function startServer() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

  // Serve static files from public directory
  app.use('/public', express.static(path.join(__dirname, '..', 'public')));

  app.use('/api/accounts', accountsRoute);
  app.use('/api/campaigns', campaignsRoute);
  app.use('/api/status', statusRoute);

  app.get('/', (req, res) => res.json({ ok: true, message: 'Rotating Mailer API' }));
  
  // API Documentation
  app.get('/api/docs', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'api-docs.html'));
  });

  app.use(errorHandler);

  return app;
};
