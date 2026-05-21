// controllers/transaction.controller.js
const service = require("../services/transaction.service");
const Transaction = require("../models/transaction.model");
const History = require("../models/history.model");

// CREATE
const createTransaction = async (req, res) => {
  try {
    const tx = await service.createTransactionService(req.body);
    
    // Retourner les informations pour la page de validation client
    res.status(201).json({
      success: true,
      data: {
        transaction: tx,
        authorized_number: tx.authorized_number,
        agent_name: tx.agent_name,
        expires_at: tx.expires_at,
        tracking_code: tx.tracking_code
      },
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// GET transaction by ID (accessible par client, agent, semi-admin, admin)
const getTransactionByIdController = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const user = req.user; // Peut être undefined pour les clients non authentifiés
    
    // Récupérer la transaction avec les détails
    const transaction = await Transaction.findById(transaction_id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction non trouvée"
      });
    }
    
    // Vérifier les droits d'accès selon le type d'utilisateur
    let hasAccess = false;
    
    if (!user) {
      // Client non authentifié - ne peut voir que les transactions en attente (pour validation client)
      // Normalement les clients utilisent le tracking_code, pas l'ID
      hasAccess = transaction.status === 'en_attente';
    } 
    else if (user.role === 'admin' || user.role === 'semi-admin') {
      // Admin et semi-admin peuvent voir toutes les transactions
      hasAccess = true;
    } 
    else if (user.role === 'agent') {
      // Agent ne peut voir que ses propres transactions
      hasAccess = transaction.assigned_agent_id === user.id;
    }
    else {
      // Autres types d'utilisateurs
      hasAccess = false;
    }
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Vous n'êtes pas autorisé à consulter cette transaction"
      });
    }
    
    // Récupérer les détails complets de la transaction (avec jointures)
    const transactionDetails = await Transaction.findDetailedById(transaction_id);
    
    // Optionnel: récupérer l'historique de la transaction
    const history = await History.findByEntity("transaction", transaction_id);
    
    res.json({
      success: true,
      data: {
        transaction: transactionDetails,
        history: history // Optionnel, peut être retiré si trop lourd
      }
    });
    
  } catch (err) {
    console.error("Erreur dans getTransactionByIdController:", err);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la transaction",
      error: err.message
    });
  }
};

// TRACKING (client)
const trackTransaction = async (req, res) => {
  try {
    const tx = await Transaction.findByTrackingCode(req.params.code);
    
    if (!tx) {
      return res.status(404).json({
        success: false,
        message: "Transaction non trouvée"
      });
    }
    
    res.json({ success: true, data: tx });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// VALIDATE CLIENT
const validateTransaction = async (req, res) => {
  try {
    const tx = await Transaction.validateByClient(req.params.id);
    
    res.json({ 
      success: true, 
      data: tx,
      message: "Transaction validée, en attente de traitement"
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// FINALIZE (admin, semi-admin, agent)
const finalizeTransaction = async (req, res) => {
  try {
    const result = await service.finalizeTransactionService(
      req.params.id,
      {
        id: req.user.id,
        type: req.user.role,
      }
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// CANCEL transaction
const cancelTransaction = async (req, res) => {
  try {
    const result = await service.cancelTransactionService(
      req.params.id,
      {
        id: req.user.id,
        type: req.user.role,
      },
      req.body.reason
    );

    res.json({
      success: true,
      data: result,
      message: "Transaction annulée avec succès"
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// GET transactions by agent (pour les agents)
const getMyTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findByAgentId(req.user.id, req.query);
    
    res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// GET all transactions (pour admin et semi-admin)
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll(req.query);
    
    res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// GET transaction history logs
const getTransactionHistory = async (req, res) => {
  try {
    const history = await History.findByEntity("transaction", req.params.id);
    
    res.json({
      success: true,
      data: history
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const stats = await service.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getChartData = async (req, res) => {
  try {
    const { period, from, to } = req.query;
    const data = await service.getChartData(period, from, to);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getRecentTransactions = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const transactions = await service.getRecentTransactions(limit);
    res.json({ success: true, data: transactions });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const exportTransactionsToCsv = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'from and to dates are required' });
    }
    const rows = await service.exportTransactions(from, to);
    
    // Convert to CSV
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No data for export' });
    }
    
    const fields = Object.keys(rows[0]);
    const csvRows = [];
    csvRows.push(fields.join(','));
    for (const row of rows) {
      const values = fields.map(field => {
        let val = row[field];
        if (val === null || val === undefined) val = '';
        if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
        if (val instanceof Date) val = val.toISOString();
        return val;
      });
      csvRows.push(values.join(','));
    }
    
    const csvData = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${from}_to_${to}.csv`);
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createTransaction,
  getTransactionByIdController,
  trackTransaction,
  validateTransaction,
  finalizeTransaction,
  cancelTransaction,
  getMyTransactions,
  getAllTransactions,
  getTransactionHistory,
  getDashboardStats,
  getChartData,
  getRecentTransactions,
  exportTransactionsToCsv

};