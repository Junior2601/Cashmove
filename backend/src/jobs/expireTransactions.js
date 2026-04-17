// jobs/expireTransactions.js
const cron = require('node-cron');
const Transaction = require('../models/transaction.model');
const { sendEmail } = require('../utils/email');

// Exécuter toutes les minutes
const startExpirationJob = () => {
  cron.schedule('* * * * *', async () => {
    console.log('Running transaction expiration check...');
    
    try {
      const expiredTransactions = await Transaction.expirePending();
      
      if (expiredTransactions.length > 0) {
        console.log(`${expiredTransactions.length} transactions expirées`);
        
        // Optionnel: Notifier les admins des transactions expirées
        for (const tx of expiredTransactions) {
          console.log(`Transaction expirée: ${tx.tracking_code}`);
        }
      }
    } catch (error) {
      console.error('Error expiring transactions:', error);
    }
  });
  
  console.log('Transaction expiration job started');
};

module.exports = { startExpirationJob };