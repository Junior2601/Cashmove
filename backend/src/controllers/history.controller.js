// controllers/history.controller.js
const History = require("../models/history.model");

// GET ALL (admin seulement) - sans pagination, version brute
const getHistory = async (req, res) => {
  try {
    const data = await History.findAll();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// GET BY ENTITY (ex: transaction)
const getByEntity = async (req, res) => {
  try {
    const { type, id } = req.params;

    const data = await History.findByEntity(type, id);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// GET BY ACTOR
const getByActor = async (req, res) => {
  try {
    const { actor_type, actor_id } = req.params;

    const data = await History.findByActor(actor_type, actor_id);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// NOUVEAU : GET avec pagination et filtres
const getHistoryPaginated = async (req, res) => {
  try {
    // Paramètres de pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Filtres optionnels
    const filters = {
      action_type: req.query.action_type,
      actor_type: req.query.actor_type,
      entity_type: req.query.entity_type,
      from_date: req.query.from_date,
      to_date: req.query.to_date,
    };
    // Supprimer les clés vides
    Object.keys(filters).forEach(key => !filters[key] && delete filters[key]);

    const result = await History.findAllPaginated(filters, page, limit);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("Erreur getHistoryPaginated:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

module.exports = {
  getHistory,
  getByEntity,
  getByActor,
  getHistoryPaginated,  // exporter la nouvelle fonction
};