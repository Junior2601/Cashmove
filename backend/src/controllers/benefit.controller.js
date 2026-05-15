const Benefit = require("../models/benefit.model");

const getTotalBenefit = async (req, res) => {
  try {
    const data = await Benefit.getTotal();

    res.json({
      success: true,
      total_rub: Number(data.total_benefit_rub || 0),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

module.exports = { getTotalBenefit };