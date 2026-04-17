const SemiAdmin = require("../models/semiAdmin.model");
const bcrypt = require("bcrypt");

// CREATE
const createSemiAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont requis",
      });
    }

    const existing = await SemiAdmin.findByEmail(email);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email déjà utilisé",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const semiAdmin = await SemiAdmin.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      data: semiAdmin,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET ALL
const getSemiAdmins = async (req, res) => {
  try {
    const data = await SemiAdmin.findAll();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// DELETE
const deleteSemiAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    await SemiAdmin.delete(id);

    res.json({
      success: true,
      message: "Semi admin supprimé",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

module.exports = {
  createSemiAdmin,
  getSemiAdmins,
  deleteSemiAdmin,
};