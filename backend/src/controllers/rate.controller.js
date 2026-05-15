const RateService = require("../services/rate.service");

const getUserRole = (req) => req.user?.role || null;
const getUserId = (req) => req.user?.id || null;

// UPSERT (create or update)
const upsertRate = async (req, res) => {
  try {
    const {
      from_currency_id,
      to_currency_id,
      rate,
      commission_percent,
      is_active,
    } = req.body;

    if (!from_currency_id || !to_currency_id || !rate) {
      return res.status(400).json({
        success: false,
        message: "Devises source, destination et taux sont requis",
      });
    }

    const result = await RateService.upsertRate(
      { from_currency_id, to_currency_id, rate, commission_percent, is_active },
      getUserId(req),
      getUserRole(req)
    );

    const status = result.created_at === result.updated_at ? 201 : 200;
    res.status(status).json({
      success: true,
      data: result,
      message: result.created_at === result.updated_at ? "Taux créé" : "Taux mis à jour",
    });
  } catch (error) {
    console.error(error);
    const errorMap = {
      "Accès refusé": 403,
      "Devise source ou destination non trouvée": 404,
      "Les devises source et destination doivent être différentes": 400,
      "Un taux existe déjà pour cette paire. Utilisez update à la place.": 400,
    };
    const status = errorMap[error.message] || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// GET ALL (admin only)
const getAllRates = async (req, res) => {
  try {
    const rates = await RateService.getAllRatesForAdmin(getUserRole(req));
    res.json({ success: true, data: rates });
  } catch (error) {
    console.error(error);
    res.status(403).json({ success: false, message: error.message });
  }
};

// GET ACTIVE (public)
const getActiveRates = async (req, res) => {
  try {
    const rates = await RateService.getActiveRates();
    res.json({ success: true, data: rates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET BY ID (admin only)
const getRateById = async (req, res) => {
  try {
    const { id } = req.params;
    const rate = await RateService.getRateById(id, getUserRole(req));
    res.json({ success: true, data: rate });
  } catch (error) {
    if (error.message === "Taux de change non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// ACTIVE RATE BY PAIR (public)
const getActiveRateByPair = async (req, res) => {
  try {
    const { from_currency_id, to_currency_id } = req.params;
    const rate = await RateService.getActiveRateByPair(from_currency_id, to_currency_id);
    res.json({ success: true, data: rate });
  } catch (error) {
    if (error.message.includes("non trouvé")) {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getActiveRateByCodes = async (req, res) => {
  try {
    const { from_code, to_code } = req.params;
    const rate = await RateService.getActiveRateByCodes(from_code, to_code);
    res.json({ success: true, data: rate });
  } catch (error) {
    if (error.message.includes("non trouvé")) {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getActiveRatesByCountry = async (req, res) => {
  try {
    const { country_id } = req.params;
    const rates = await RateService.getActiveRatesByCountry(country_id);
    res.json({ success: true, data: rates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getActiveRatesByCurrency = async (req, res) => {
  try {
    const { currency_id } = req.params;
    const rates = await RateService.getActiveRatesByCurrency(currency_id);
    res.json({ success: true, data: rates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// UPDATE RATE (admin only)
const updateRate = async (req, res) => {
  try {
    const { id } = req.params;
    const { rate, commission_percent, is_active } = req.body;
    const updated = await RateService.updateRate(
      id,
      { rate, commission_percent, is_active },
      getUserRole(req)
    );
    res.json({ success: true, data: updated, message: "Taux mis à jour" });
  } catch (error) {
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Taux de change non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const toggleRateActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    if (is_active === undefined) {
      return res.status(400).json({ success: false, message: "is_active requis" });
    }
    const updated = await RateService.toggleRateActive(id, is_active, getUserRole(req));
    res.json({
      success: true,
      data: updated,
      message: `Taux ${is_active ? "activé" : "désactivé"}`,
    });
  } catch (error) {
    if (error.message === "Accès refusé") return res.status(403).json({ success: false, message: error.message });
    if (error.message === "Taux de change non trouvé") return res.status(404).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const deleteRate = async (req, res) => {
  try {
    const { id } = req.params;
    await RateService.softDeleteRate(id, getUserRole(req));
    res.json({ success: true, message: "Taux supprimé (soft delete)" });
  } catch (error) {
    if (error.message === "Accès refusé") return res.status(403).json({ success: false, message: error.message });
    if (error.message === "Taux de change non trouvé") return res.status(404).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const hardDeleteRate = async (req, res) => {
  try {
    const { id } = req.params;
    await RateService.hardDeleteRate(id, getUserRole(req));
    res.json({ success: true, message: "Taux supprimé définitivement" });
  } catch (error) {
    if (error.message === "Accès refusé") return res.status(403).json({ success: false, message: error.message });
    if (error.message === "Taux de change non trouvé") return res.status(404).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const convertCurrency = async (req, res) => {
  try {
    const { from_currency_id, to_currency_id, amount } = req.body;
    if (!from_currency_id || !to_currency_id || !amount) {
      return res.status(400).json({
        success: false,
        message: "Devises source, destination et montant sont requis",
      });
    }
    const conversion = await RateService.convertAmount(from_currency_id, to_currency_id, amount);
    if (!conversion) {
      return res.status(404).json({
        success: false,
        message: "Taux de change actif non trouvé pour cette paire",
      });
    }
    res.json({ success: true, data: conversion });
  } catch (error) {
    if (error.message === "Le montant doit être supérieur à 0") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

module.exports = {
  upsertRate,
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