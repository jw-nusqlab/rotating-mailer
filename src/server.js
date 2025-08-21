// src/server.js
require('express-async-errors');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./config/logger');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const accountsRoute = require('./routes/accounts');
const campaignsRoute = require('./routes/campaigns');
const statusRoute = require('./routes/status');
const errorHandler = require('./middlewares/errorHandler');

module.exports = async function startServer() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

  // OpenAPI spec and Swagger UI
  const openapiPath = path.resolve(__dirname, '..', 'openapi.yaml');
  let openapiDoc = null;
  try {
    openapiDoc = YAML.load(openapiPath);
  } catch (e) {
    logger.error('Failed to load OpenAPI spec', { err: e.message });
  }

  app.get('/api/openapi.yaml', (req, res) => {
    res.type('text/yaml');
    try {
      const yamlString = fs.readFileSync(openapiPath, 'utf8');
      res.send(yamlString);
    } catch (e) {
      res.status(500).send('Spec not available');
    }
  });

  if (openapiDoc) {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));
  }

  app.use('/api/accounts', accountsRoute);
  app.use('/api/campaigns', campaignsRoute);
  app.use('/api/status', statusRoute);

  app.get('/', (req, res) => res.json({ ok: true, message: 'Rotating Mailer API' }));

  app.use(errorHandler);

  return app;
};
