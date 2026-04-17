const Currency = require("../models/currency.model");

// CREATE - Admin seulement
const createCurrency = async (req, res) => {
  try {
    const { name, code, symbol, is_active } = req.body;

    if (!name || !code || !symbol) {
      return res.status(400).json({
        success: false,
        message: "Nom, code et symbole sont requis",
      });
    }

    const currency = await Currency.create({ name, code, symbol, is_active });

    res.status(201).json({
      success: true,
      data: currency,
      message: "Devise créée avec succès",
    });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') { // Code d'erreur PostgreSQL pour violation d'unicité
      return res.status(400).json({ 
        success: false, 
        message: "Ce code de devise existe déjà" 
      });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET ALL - Différenciation selon rôle
const getCurrencies = async (req, res) => {
  try {
    // Si l'utilisateur est admin, il voit toutes les devises
    if (req.user && req.user.role === 'admin') {
      const currencies = await Currency.findAllForAdmin();
      return res.json({
        success: true,
        data: currencies,
        message: "Toutes les devises (actives et inactives)",
      });
    }
    
    // Sinon (utilisateur normal ou non authentifié), seulement les actives
    const currencies = await Currency.findAllActive();
    res.json({
      success: true,
      data: currencies,
      message: "Devises actives uniquement",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET BY ID - Admin voit tout, autres voient seulement si active
const getCurrencyById = async (req, res) => {
  try {
    const { id } = req.params;
    const currency = await Currency.findById(id);

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: "Devise non trouvée",
      });
    }

    // Si l'utilisateur n'est pas admin et que la devise est inactive
    if ((!req.user || req.user.role !== 'admin') && !currency.is_active) {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé à cette devise",
      });
    }

    res.json({
      success: true,
      data: currency,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// UPDATE - Admin seulement
const updateCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, symbol, is_active } = req.body;

    // Vérifier si la devise existe
    const existingCurrency = await Currency.findById(id);
    if (!existingCurrency) {
      return res.status(404).json({
        success: false,
        message: "Devise non trouvée",
      });
    }

    const updated = await Currency.update(id, { name, code, symbol, is_active });

    res.json({
      success: true,
      data: updated,
      message: "Devise mise à jour avec succès",
    });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(400).json({ 
        success: false, 
        message: "Ce code de devise existe déjà" 
      });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// SOFT DELETE (Désactiver) - Admin seulement
const disableCurrency = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCurrency = await Currency.findById(id);
    if (!existingCurrency) {
      return res.status(404).json({
        success: false,
        message: "Devise non trouvée",
      });
    }

    if (!existingCurrency.is_active) {
      return res.status(400).json({
        success: false,
        message: "Cette devise est déjà désactivée",
      });
    }

    const disabled = await Currency.softDelete(id);

    res.json({
      success: true,
      data: disabled,
      message: "Devise désactivée avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// REACTIVATE - Admin seulement
const reactivateCurrency = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCurrency = await Currency.findById(id);
    if (!existingCurrency) {
      return res.status(404).json({
        success: false,
        message: "Devise non trouvée",
      });
    }

    if (existingCurrency.is_active) {
      return res.status(400).json({
        success: false,
        message: "Cette devise est déjà active",
      });
    }

    const reactivated = await Currency.reactivate(id);

    res.json({
      success: true,
      data: reactivated,
      message: "Devise réactivée avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// HARD DELETE (Suppression définitive) - Admin seulement
const deleteCurrency = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCurrency = await Currency.findById(id);
    if (!existingCurrency) {
      return res.status(404).json({
        success: false,
        message: "Devise non trouvée",
      });
    }

    await Currency.hardDelete(id);

    res.json({
      success: true,
      message: "Devise supprimée définitivement",
    });
  } catch (error) {
    console.error(error);
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