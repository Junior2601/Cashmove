const adminService = require("../services/admin.service");

// Créer un admin (inscription)
const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont requis",
      });
    }

    const admin = await adminService.createAdmin({ name, email, password });

    res.status(201).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error(error);
    if (error.message === "Email déjà utilisé") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Récupérer tous les admins
const getAdmins = async (req, res) => {
  try {
    const admins = await adminService.getAllAdmins();
    res.json({
      success: true,
      data: admins,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Supprimer un admin
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await adminService.deleteAdmin(id);
    res.json({
      success: true,
      message: "Admin supprimé",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Connexion
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe requis",
      });
    }

    const result = await adminService.loginAdmin(email, password);

    res.json({
      success: true,
      message: "Connexion réussie",
      token: result.token,
      admin: result.admin,
    });
  } catch (error) {
    console.error(error);
    if (error.message === "Email ou mot de passe incorrect") {
      return res.status(401).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

module.exports = {
  createAdmin,
  getAdmins,
  deleteAdmin,
  login,
};