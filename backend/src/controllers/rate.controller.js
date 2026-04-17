const Rate = require("../models/rate.model");
const Currency = require("../models/currency.model");
const Country = require("../models/country.model");

// CREATE OR UPDATE - Admin seulement
const createOrUpdateRate = async (req, res) => {
  try {
    const {
      from_currency_id,
      to_currency_id,
      rate,
      commission_percent,
      is_active
    } = req.body;

    const admin_id = req.user.id;

    if (!from_currency_id || !to_currency_id || !rate) {
      return res.status(400).json({
        success: false,
        message: "Devises source, destination et taux sont requis",
      });
    }

    if (from_currency_id === to_currency_id) {
      return res.status(400).json({
        success: false,
        message: "Les devises source et destination doivent être différentes",
      });
    }

    // Vérifier si les devises existent
    const fromCurrency = await Currency.findById(from_currency_id);
    const toCurrency = await Currency.findById(to_currency_id);
    
    if (!fromCurrency || !toCurrency) {
      return res.status(404).json({
        success: false,
        message: "Devise source ou destination non trouvée",
      });
    }

    // Vérifier si un taux existe déjà pour cette paire
    const existing = await Rate.existsForPair(from_currency_id, to_currency_id);

    let result;

    if (existing) {
      // UPDATE
      result = await Rate.update(existing.id, {
        rate,
        commission_percent: commission_percent !== undefined ? commission_percent : 0.75,
        is_active: is_active !== undefined ? is_active : true,
      });
      
      return res.json({
        success: true,
        data: result,
        message: "Taux de change mis à jour avec succès",
      });
    } else {
      // CREATE
      result = await Rate.create({
        from_currency_id,
        to_currency_id,
        rate,
        commission_percent: commission_percent !== undefined ? commission_percent : 0.75,
        created_by: admin_id,
      });
      
      // Si is_active est false, désactiver après création
      if (is_active === false) {
        result = await Rate.toggleActive(result.id, false);
      }
      
      return res.status(201).json({
        success: true,
        data: result,
        message: "Taux de change créé avec succès",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// GET ALL RATES (admin seulement)
const getAllRates = async (req, res) => {
  try {
    // Seul l'admin peut voir tous les taux
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé",
      });
    }

    const rates = await Rate.findAllForAdmin();

    res.json({
      success: true,
      data: rates,
      message: "Tous les taux de change",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// GET ACTIVE RATES (public)
const getActiveRates = async (req, res) => {
  try {
    const rates = await Rate.findAllActive();

    res.json({
      success: true,
      data: rates,
      message: "Taux de change actifs",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// GET RATE BY ID (admin seulement)
const getRateById = async (req, res) => {
  try {
    const { id } = req.params;
    const rate = await Rate.findById(id);

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: "Taux de change non trouvé",
      });
    }

    res.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// GET ACTIVE RATE BY CURRENCY PAIR (public)
const getActiveRateByPair = async (req, res) => {
  try {
    const { from_currency_id, to_currency_id } = req.params;

    const rate = await Rate.findActiveRate(from_currency_id, to_currency_id);

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: "Taux de change actif non trouvé pour cette paire de devises",
      });
    }

    res.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// GET ACTIVE RATE BY CURRENCY CODES (public)
const getActiveRateByCodes = async (req, res) => {
  try {
    const { from_code, to_code } = req.params;

    const rate = await Rate.findActiveRateByCode(from_code, to_code);

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: `Taux de change actif non trouvé pour ${from_code} → ${to_code}`,
      });
    }

    res.json({
      success: true,
      data: rate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// GET ACTIVE RATES BY COUNTRY (public)
const getActiveRatesByCountry = async (req, res) => {
  try {
    const { country_id } = req.params;

    const country = await Country.findById(country_id);
    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Pays non trouvé",
      });
    }

    const rates = await Rate.findActiveRatesByCountry(country_id);

    res.json({
      success: true,
      data: rates,
      message: `Taux de change pour ${country.name}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// GET ACTIVE RATES BY CURRENCY (public)
const getActiveRatesByCurrency = async (req, res) => {
  try {
    const { currency_id } = req.params;

    const currency = await Currency.findById(currency_id);
    if (!currency) {
      return res.status(404).json({
        success: false,
        message: "Devise non trouvée",
      });
    }

    const rates = await Rate.findActiveRatesByCurrency(currency_id);

    res.json({
      success: true,
      data: rates,
      message: `Taux de change pour la devise ${currency.code}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// UPDATE RATE (admin seulement)
const updateRate = async (req, res) => {
  try {
    const { id } = req.params;
    const { rate, commission_percent, is_active } = req.body;

    const existingRate = await Rate.findById(id);
    if (!existingRate) {
      return res.status(404).json({
        success: false,
        message: "Taux de change non trouvé",
      });
    }

    const updated = await Rate.update(id, {
      rate: rate || existingRate.rate,
      commission_percent: commission_percent !== undefined ? commission_percent : existingRate.commission_percent,
      is_active: is_active !== undefined ? is_active : existingRate.is_active,
    });

    res.json({
      success: true,
      data: updated,
      message: "Taux de change mis à jour avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// TOGGLE ACTIVE STATUS (admin seulement)
const toggleRateActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({
        success: false,
        message: "Le statut is_active est requis",
      });
    }

    const existingRate = await Rate.findById(id);
    if (!existingRate) {
      return res.status(404).json({
        success: false,
        message: "Taux de change non trouvé",
      });
    }

    const updated = await Rate.toggleActive(id, is_active);

    res.json({
      success: true,
      data: updated,
      message: `Taux de change ${is_active ? 'activé' : 'désactivé'} avec succès`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// SOFT DELETE (admin seulement)
const deleteRate = async (req, res) => {
  try {
    const { id } = req.params;

    const existingRate = await Rate.findById(id);
    if (!existingRate) {
      return res.status(404).json({
        success: false,
        message: "Taux de change non trouvé",
      });
    }

    await Rate.softDelete(id);

    res.json({
      success: true,
      message: "Taux de change supprimé avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// HARD DELETE (admin seulement)
const hardDeleteRate = async (req, res) => {
  try {
    const { id } = req.params;

    const existingRate = await Rate.findById(id);
    if (!existingRate) {
      return res.status(404).json({
        success: false,
        message: "Taux de change non trouvé",
      });
    }

    await Rate.hardDelete(id);

    res.json({
      success: true,
      message: "Taux de change supprimé définitivement",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// CONVERT AMOUNT (public)
const convertCurrency = async (req, res) => {
  try {
    const { from_currency_id, to_currency_id, amount } = req.body;

    if (!from_currency_id || !to_currency_id || !amount) {
      return res.status(400).json({
        success: false,
        message: "Devises source, destination et montant sont requis",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Le montant doit être supérieur à 0",
      });
    }

    const conversion = await Rate.convertAmount(from_currency_id, to_currency_id, amount);

    if (!conversion) {
      return res.status(404).json({
        success: false,
        message: "Taux de change actif non trouvé pour cette paire de devises",
      });
    }

    res.json({
      success: true,
      data: conversion,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

module.exports = {
  createOrUpdateRate,
  getAllRates,
  getActiveRates,
  getRateById,
  getActiveRateByPair,
  getActiveRateByCodes,
  getActiveRatesByCountry,
  getActiveRatesByCurrency,
  updateRate,
  toggleRateActive,
  deleteRate,
  hardDeleteRate,
  convertCurrency,
};