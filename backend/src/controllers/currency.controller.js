const CurrencyService = require("../services/currency.service");

// Helper pour récupérer le rôle (depuis req.user)
const getUserRole = (req) => req.user?.role || null;

const createCurrency = async (req, res) => {
  try {
    const { name, code, symbol, is_active } = req.body;
    if (!name || !code || !symbol) {
      return res.status(400).json({
        success: false,
        message: "Nom, code et symbole sont requis",
      });
    }

    const currency = await CurrencyService.createCurrency({
      name,
      code,
      symbol,
      is_active,
    });

    res.status(201).json({
      success: true,
      data: currency,
      message: "Devise créée avec succès",
    });
  } catch (error) {
    console.error(error);
    if (error.message === "Ce code de devise existe déjà") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getCurrencies = async (req, res) => {
  try {
    const role = getUserRole(req);
    const currencies = await CurrencyService.getCurrencies(role);
    res.json({
      success: true,
      data: currencies,
      message: role === "admin" ? "Toutes les devises" : "Devises actives uniquement",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getCurrencyById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getUserRole(req);
    const currency = await CurrencyService.getCurrencyById(id, role);
    res.json({ success: true, data: currency });
  } catch (error) {
    if (error.message === "Devise non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès non autorisé à cette devise") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const updateCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, symbol, is_active } = req.body;
    const role = getUserRole(req);

    const updated = await CurrencyService.updateCurrency(
      id,
      { name, code, symbol, is_active },
      role
    );

    res.json({ success: true, data: updated, message: "Devise mise à jour" });
  } catch (error) {
    console.error(error);
    if (error.message === "Devise non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Ce code de devise existe déjà") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const disableCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getUserRole(req);
    const disabled = await CurrencyService.disableCurrency(id, role);
    res.json({ success: true, data: disabled, message: "Devise désactivée" });
  } catch (error) {
    if (error.message === "Devise non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Cette devise est déjà désactivée") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const reactivateCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getUserRole(req);
    const reactivated = await CurrencyService.reactivateCurrency(id, role);
    res.json({ success: true, data: reactivated, message: "Devise réactivée" });
  } catch (error) {
    if (error.message === "Devise non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Cette devise est déjà active") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const deleteCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getUserRole(req);
    await CurrencyService.deleteCurrency(id, role);
    res.json({ success: true, message: "Devise supprimée définitivement" });
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

module.exports = {
  createCurrency,
  getCurrencies,
  getCurrencyById,
  updateCurrency,
  disableCurrency,
  reactivateCurrency,
  deleteCurrency,
};