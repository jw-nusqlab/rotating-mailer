// src/services/queue.service.js
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { REDIS_URL } = require('../config');
const logger = require('../config/logger');
const mailerService = require('./mailer.service');

let queue;
let worker;
let connection;

module.exports = {
  init: async function initQueue() {
    // Parse Redis URL and create connection with proper auth
    const redisUrl = REDIS_URL 
    
    // Parse Redis URL manually
    let host, port, username, password;
    
    if (redisUrl.startsWith('redis://')) {
      const url = new URL(redisUrl);
      console.log(url);
      
      host = url.hostname;
      port = url.port || 1234;
      username = url.username || undefined;
      password = url.password || undefined;
    } 
    
    
    const redisOptions = { 
      host,
      port,
      username,
      password,
      maxRetriesPerRequest: null,
      retryDelayOnFailover: 100,
      enableReadyCheck: false
    };
    
    connection = new IORedis(redisOptions);
    queue = new Queue('mail-queue', { connection });
    // create worker - concurrency 1 to keep ordered rotation simple
    worker = new Worker(
      'mail-queue',
      async job => {
        const { name, data } = job;
        logger.info('Processing job', { name, data });
        if (name === 'send-email') {
          return await mailerService.processSendEmailJob(data);
        }
        return null;
      },
      { connection, concurrency: 1 }
    );

    worker.on('completed', job => logger.info(`Job ${job.id} completed`));
    worker.on('failed', (job, err) => logger.error(`Job ${job.id} failed`, err));

    return { queue, worker };
  },

  addJob: async function addJob(name, data, opts = {}) {
    if (!queue) throw new Error('Queue not initialized');
    // default attempts to 1 (we handle retries manually per recipient)
    const options = { attempts: 1, removeOnComplete: true, removeOnFail: false, ...opts };
    return await queue.add(name, data, options);
  },

  status: async function status() {
    return {
      queueInitialized: !!queue,
      workerRunning: !!worker
    };
  }
};
