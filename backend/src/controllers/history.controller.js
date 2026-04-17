const History = require("../models/history.model");

// GET ALL (admin seulement)
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

module.exports = {
  getHistory,
  getByEntity,
  getByActor,
};