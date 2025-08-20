// scripts/seed-accounts.js
require('dotenv').config();
const storage = require('../src/repositories/storage');

async function seed() {
  await storage.connect();
  const accounts = [
    {
      email: 'jameswilliams.nusqlab@gmail.com',
      host: "smtp.gmail.com",
      port: 465,
      secure: false,
      auth: { user: 'jameswilliams.nusqlab@gmail.com', pass: 'Nusqlab@980' },
    }
    // add more test accounts
  ];

  for (const a of accounts) {
    try {
      const added = await storage.addAccount(a);
      console.log('Added', added.email);
    } catch (err) {
      console.warn('Could not add', a.email, err.message);
    }
  }
  process.exit(0);
}

seed();
