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

module.exports = {
  createTransaction,
  trackTransaction,
  validateTransaction,
  finalizeTransaction,
  cancelTransaction,
  getMyTransactions,
  getAllTransactions,
  getTransactionHistory
};