const Balance = require("../models/balance.model");
const Agent = require("../models/agent.model"); // Supposons que vous avez ce modèle
const Currency = require("../models/currency.model");

// CREATE - Admin seulement
const createBalance = async (req, res) => {
  try {
    const { agent_id, currency_id, amount } = req.body;

    if (!agent_id || !currency_id) {
      return res.status(400).json({
        success: false,
        message: "Agent et devise sont requis",
      });
    }

    // Vérifier si l'agent existe
    const agent = await Agent.findById(agent_id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent non trouvé",
      });
    }

    // Vérifier si la devise existe
    const currency = await Currency.findById(currency_id);
    if (!currency) {
      return res.status(404).json({
        success: false,
        message: "Devise non trouvée",
      });
    }

    // Vérifier si une balance existe déjà pour cet agent et cette devise
    const existingBalance = await Balance.hasBalance(agent_id, currency_id);
    if (existingBalance) {
      return res.status(400).json({
        success: false,
        message: "Une balance existe déjà pour cet agent avec cette devise",
      });
    }

    const balance = await Balance.create({
      agent_id,
      currency_id,
      amount: amount || 0
    });

    res.status(201).json({
      success: true,
      data: balance,
      message: "Balance créée avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET ALL - Différenciation selon rôle
const getAllBalances = async (req, res) => {
  try {
    // Admin voit toutes les balances
    if (req.user.role === 'admin') {
      const balances = await Balance.findAllForAdmin();
      return res.json({
        success: true,
        data: balances,
        message: "Toutes les balances",
      });
    }
    
    // Semi-admin voit toutes les balances des agents
    if (req.user.role === 'semi_admin') {
      const balances = await Balance.findAllForSemiAdmin();
      return res.json({
        success: true,
        data: balances,
        message: "Balances de tous les agents",
      });
    }
    
    // Agent ne voit que ses propres balances
    if (req.user.role === 'agent') {
      const balances = await Balance.findByAgent(req.user.id);
      return res.json({
        success: true,
        data: balances,
        message: "Mes balances",
      });
    }
    
    return res.status(403).json({
      success: false,
      message: "Rôle non autorisé",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET BY AGENT - Selon les permissions
const getBalancesByAgent = async (req, res) => {
  try {
    const { agent_id } = req.params;

    // Vérifier si l'agent existe
    const agent = await Agent.findById(agent_id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent non trouvé",
      });
    }

    // Admin peut voir les balances de n'importe quel agent
    if (req.user.role === 'admin') {
      const balances = await Balance.findByAgent(agent_id);
      return res.json({
        success: true,
        data: balances,
        message: `Balances de l'agent ${agent.name}`,
      });
    }
    
    // Semi-admin peut voir les balances de n'importe quel agent
    if (req.user.role === 'semi_admin') {
      const balances = await Balance.findByAgent(agent_id);
      return res.json({
        success: true,
        data: balances,
        message: `Balances de l'agent ${agent.name}`,
      });
    }
    
    // Agent ne peut voir que ses propres balances
    if (req.user.role === 'agent') {
      if (parseInt(agent_id) !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Vous ne pouvez voir que vos propres balances",
        });
      }
      const balances = await Balance.findByAgent(agent_id);
      return res.json({
        success: true,
        data: balances,
        message: "Mes balances",
      });
    }
    
    return res.status(403).json({
      success: false,
      message: "Accès non autorisé",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET BY ID - Selon les permissions
const getBalanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const balance = await Balance.findById(id);

    if (!balance) {
      return res.status(404).json({
        success: false,
        message: "Balance non trouvée",
      });
    }

    // Admin peut voir n'importe quelle balance
    if (req.user.role === 'admin') {
      return res.json({
        success: true,
        data: balance,
      });
    }
    
    // Semi-admin peut voir n'importe quelle balance
    if (req.user.role === 'semi_admin') {
      return res.json({
        success: true,
        data: balance,
      });
    }
    
    // Agent ne peut voir que ses propres balances
    if (req.user.role === 'agent') {
      if (balance.agent_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Vous ne pouvez voir que vos propres balances",
        });
      }
      return res.json({
        success: true,
        data: balance,
      });
    }
    
    return res.status(403).json({
      success: false,
      message: "Accès non autorisé",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// CREDIT - Admin seulement
const creditBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Montant valide requis pour le crédit",
      });
    }

    const balance = await Balance.findById(id);
    if (!balance) {
      return res.status(404).json({
        success: false,
        message: "Balance non trouvée",
      });
    }

    const updatedBalance = await Balance.credit(id, amount, description);

    res.json({
      success: true,
      data: updatedBalance,
      message: `Crédit de ${amount} effectué avec succès`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// DEBIT - Admin seulement
const debitBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Montant valide requis pour le débit",
      });
    }

    const balance = await Balance.findById(id);
    if (!balance) {
      return res.status(404).json({
        success: false,
        message: "Balance non trouvée",
      });
    }

    if (balance.amount < amount) {
      return res.status(400).json({
        success: false,
        message: "Solde insuffisant",
        current_balance: balance.amount,
        requested_debit: amount,
      });
    }

    const updatedBalance = await Balance.debit(id, amount, description);

    res.json({
      success: true,
      data: updatedBalance,
      message: `Débit de ${amount} effectué avec succès`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// UPDATE - Admin seulement
const updateBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Montant requis",
      });
    }

    if (amount < 0) {
      return res.status(400).json({
        success: false,
        message: "Le montant ne peut pas être négatif",
      });
    }

    const existingBalance = await Balance.findById(id);
    if (!existingBalance) {
      return res.status(404).json({
        success: false,
        message: "Balance non trouvée",
      });
    }

    const updated = await Balance.updateAmount(id, amount);

    res.json({
      success: true,
      data: updated,
      message: "Balance mise à jour avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// SOFT DELETE - Admin seulement
const deleteBalance = async (req, res) => {
  try {
    const { id } = req.params;

    const existingBalance = await Balance.findById(id);
    if (!existingBalance) {
      return res.status(404).json({
        success: false,
        message: "Balance non trouvée",
      });
    }

    await Balance.softDelete(id);

    res.json({
      success: true,
      message: "Balance supprimée avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// HARD DELETE - Admin seulement
const hardDeleteBalance = async (req, res) => {
  try {
    const { id } = req.params;

    const existingBalance = await Balance.findById(id);
    if (!existingBalance) {
      return res.status(404).json({
        success: false,
        message: "Balance non trouvée",
      });
    }

    await Balance.hardDelete(id);

    res.json({
      success: true,
      message: "Balance supprimée définitivement",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET BALANCES BY CURRENCY - Admin seulement
const getBalancesByCurrency = async (req, res) => {
  try {
    const { currency_id } = req.params;

    const currency = await Currency.findById(currency_id);
    if (!currency) {
      return res.status(404).json({
        success: false,
        message: "Devise non trouvée",
      });
    }

    const balances = await Balance.getBalancesByCurrency(currency_id);

    res.json({
      success: true,
      data: balances,
      message: `Balances pour la devise ${currency.code}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET TOTAL BALANCE BY AGENT - Selon les permissions
const getTotalBalanceByAgent = async (req, res) => {
  try {
    const { agent_id } = req.params;

    const agent = await Agent.findById(agent_id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent non trouvé",
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && req.user.role !== 'semi_admin') {
      if (req.user.role === 'agent' && parseInt(agent_id) !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Vous ne pouvez voir que vos propres balances",
        });
      }
    }

    const total = await Balance.getTotalBalanceByAgent(agent_id);

    res.json({
      success: true,
      data: {
        agent_id: parseInt(agent_id),
        agent_name: agent.name,
        total_balance: total,
      },
      message: "Solde total de l'agent",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

module.exports = {
  createBalance,
  getAllBalances,
  getBalanceById,
  getBalancesByAgent,
  getBalancesByCurrency,
  getTotalBalanceByAgent,
  creditBalance,
  debitBalance,
  updateBalance,
  deleteBalance,
  hardDeleteBalance,
};