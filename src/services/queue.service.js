// src/services/queue.service.js
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { REDIS_URL, QUEUE_MODE } = require('../config');
const logger = require('../config/logger');
const mailerService = require('./mailer.service');

let queue;
let worker;
let connection;

module.exports = {
  init: async function initQueue() {
    if (QUEUE_MODE === 'inline') {
      logger.info('Queue running in inline mode (serverless-safe)');
      queue = {
        add: async (name, data) => {
          logger.info('Inline job execution', { name, data });
          if (name === 'send-email') {
            return await mailerService.processSendEmailJob(data);
          }
          return null;
        }
      };
      worker = null;
      return { queue, worker };
    }

    const redisUrl = REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL is required when QUEUE_MODE=bullmq');
    }

    let host, port, username, password, tls;
    if (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) {
      const url = new URL(redisUrl);
      host = url.hostname;
      port = url.port ? Number(url.port) : 6379;
      username = url.username || undefined;
      password = url.password || undefined;
      if (url.protocol === 'rediss:') {
        tls = {};
      }
    } else {
      throw new Error('Unsupported REDIS_URL scheme. Use redis:// or rediss://');
    }

    const redisOptions = {
      host,
      port,
      username,
      password,
      tls,
      maxRetriesPerRequest: null,
      retryDelayOnFailover: 100,
      enableReadyCheck: false
    };

    connection = new IORedis(redisOptions);
    connection.on('error', (e) => logger.error('Redis connection error', { err: e.message }));
    queue = new Queue('mail-queue', { connection });
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
