// jobs/expireTransactions.js
const cron = require('node-cron');
const Transaction = require('../models/transaction.model');

let isRunning = false;  // ← empêche deux exécutions simultanées

const startExpirationJob = () => {
  cron.schedule('* * * * *', async () => {
    if (isRunning) {
      console.warn('⏭️  Expiration job already running, skipping...');
      return;
    }
    isRunning = true;

    try {
      const expired = await Transaction.expirePending();
      if (expired.length > 0) {
        console.log(`✅ ${expired.length} transaction(s) expirée(s):`, 
          expired.map(t => t.tracking_code).join(', '));
      }
    } catch (error) {
      console.error('❌ Expiration job error:', error.message);
    } finally {
      isRunning = false;  // ← toujours libéré même en cas d'erreur
    }
  });

  console.log('✅ Transaction expiration job started');
};

module.exports = { startExpirationJob };