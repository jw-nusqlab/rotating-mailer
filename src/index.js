require('dotenv').config();
const { PORT } = require('./config');
const logger = require('./config/logger');
const startServer = require('./server');
const storage = require('./repositories/storage');
const queueService = require('./services/queue.service');

async function main() {
  try {
    await storage.connect();
    logger.info('Connected to MongoDB');
    // start express server
    const app = await startServer();
    app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });

    // init queue & worker
    await queueService.init();
    logger.info('Queue service initialized');
  } catch (err) {
    logger.error('Startup error', err);
    process.exit(1);
  }
}

main();

module.exports = main