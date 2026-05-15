const BalanceService = require("../services/balance.service");

const getUserRole = (req) => req.user?.role || null;
const getUserId = (req) => req.user?.id || null;

const createBalance = async (req, res) => {
  try {
    const { agent_id, currency_id, amount } = req.body;
    if (!agent_id || !currency_id) {
      return res.status(400).json({
        success: false,
        message: "Agent et devise sont requis",
      });
    }
    const balance = await BalanceService.createBalance(
      { agent_id, currency_id, amount },
      getUserRole(req),
      getUserId(req)
    );
    res.status(201).json({
      success: true,
      data: balance,
      message: "Balance créée avec succès",
    });
  } catch (error) {
    console.error(error);
    const errorMap = {
      "Accès refusé": 403,
      "Agent non trouvé": 404,
      "Devise non trouvée": 404,
      "Une balance existe déjà pour cet agent avec cette devise": 400,
    };
    const status = errorMap[error.message] || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

const getAllBalances = async (req, res) => {
  try {
    const balances = await BalanceService.getAllBalances(getUserRole(req), getUserId(req));
    res.json({ success: true, data: balances });
  } catch (error) {
    console.error(error);
    res.status(403).json({ success: false, message: error.message });
  }
};

const getBalanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const balance = await BalanceService.getBalanceById(id, getUserRole(req), getUserId(req));
    res.json({ success: true, data: balance });
  } catch (error) {
    if (error.message === "Balance non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Vous ne pouvez voir que vos propres balances" || error.message === "Accès non autorisé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getBalancesByAgent = async (req, res) => {
  try {
    const { agent_id } = req.params;
    const balances = await BalanceService.getBalancesByAgent(agent_id, getUserRole(req), getUserId(req));
    res.json({ success: true, data: balances });
  } catch (error) {
    if (error.message === "Agent non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Vous ne pouvez voir que vos propres balances") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getTotalBalanceByAgent = async (req, res) => {
  try {
    const { agent_id } = req.params;
    const result = await BalanceService.getTotalBalanceByAgent(agent_id, getUserRole(req), getUserId(req));
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === "Agent non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Vous ne pouvez voir que vos propres balances") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getBalancesByCurrency = async (req, res) => {
  try {
    const { currency_id } = req.params;
    const balances = await BalanceService.getBalancesByCurrency(currency_id, getUserRole(req));
    res.json({ success: true, data: balances });
  } catch (error) {
    if (error.message === "Devise non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const creditBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    const updated = await BalanceService.creditBalance(id, amount, description, getUserRole(req));
    res.json({ success: true, data: updated, message: `Crédit de ${amount} effectué` });
  } catch (error) {
    if (error.message === "Balance non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Montant valide requis pour le crédit") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const debitBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    const updated = await BalanceService.debitBalance(id, amount, description, getUserRole(req));
    res.json({ success: true, data: updated, message: `Débit de ${amount} effectué` });
  } catch (error) {
    if (error.message === "Balance non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message.includes("Solde insuffisant")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.message === "Montant valide requis pour le débit") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const updateBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    if (amount === undefined) {
      return res.status(400).json({ success: false, message: "Montant requis" });
    }
    const updated = await BalanceService.updateBalanceAmount(id, amount, getUserRole(req));
    res.json({ success: true, data: updated, message: "Balance mise à jour" });
  } catch (error) {
    if (error.message === "Balance non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Le montant ne peut pas être négatif") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const deleteBalance = async (req, res) => {
  try {
    const { id } = req.params;
    await BalanceService.softDeleteBalance(id, getUserRole(req));
    res.json({ success: true, message: "Balance supprimée avec succès" });
  } catch (error) {
    if (error.message === "Balance non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const hardDeleteBalance = async (req, res) => {
  try {
    const { id } = req.params;
    await BalanceService.hardDeleteBalance(id, getUserRole(req));
    res.json({ success: true, message: "Balance supprimée définitivement" });
  } catch (error) {
    if (error.message === "Balance non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

module.exports = {
  createBalance,
  getAllBalances,
  getBalanceById,
  getBalancesByAgent,
  getTotalBalanceByAgent,
  getBalancesByCurrency,
  creditBalance,
  debitBalance,
  updateBalance,
  deleteBalance,
  hardDeleteBalance,
};