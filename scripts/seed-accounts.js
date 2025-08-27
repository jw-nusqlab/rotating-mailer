// scripts/seed-accounts.js
require('dotenv').config();
const storage = require('../src/repositories/storage');

async function seed() {
  // await storage.connect();
  // const accounts = [
  //   {
  //     email: process.env.SEED_EMAIL || 'sender@example.com',
  //     host: process.env.SEED_SMTP_HOST || "smtp.gmail.com",
  //     port: Number(process.env.SEED_SMTP_PORT || 587),
  //     secure: String(process.env.SEED_SMTP_SECURE || 'false') === 'true',
  //     auth: { user: process.env.SEED_EMAIL || 'sender@example.com', pass: process.env.SEED_SMTP_PASS || 'your-app-password' },
  //   }
  //   // add more test accounts
  // ];

  // for (const a of accounts) {
  //   try {
  //     const added = await storage.addAccount(a);
  //     console.log('Added', added.email);
  //   } catch (err) {
  //     console.warn('Could not add', a.email, err.message);
  //   }
  // }
  // process.exit(0);
}

seed();
