const Admin = require("../models/admin.model");
const bcrypt = require("bcrypt");

// CREATE
const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont requis",
      });
    }

    const existing = await Admin.findByEmail(email);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email déjà utilisé",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET ALL
const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.findAll();

    res.json({
      success: true,
      data: admins,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// DELETE
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    await Admin.delete(id);

    res.json({
      success: true,
      message: "Admin supprimé",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

module.exports = {
  createAdmin,
  getAdmins,
  deleteAdmin,
};