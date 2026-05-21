const SemiAdminService = require("../services/semiAdmin.service");

// Création (admin seulement)
const createSemiAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Tous les champs sont requis" });
    }

    const newAdmin = await SemiAdminService.createSemiAdmin(name, email, password);
    res.status(201).json({ success: true, data: newAdmin });
  } catch (error) {
    if (error.message === "EMAIL_ALREADY_USED") {
      return res.status(400).json({ success: false, message: "Email déjà utilisé" });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Login semi-admin (public)
const loginSemiAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email et mot de passe requis" });
    }

    const { token, semiAdmin } = await SemiAdminService.loginSemiAdmin(email, password);
    res.json({ success: true, token, semiAdmin });
  } catch (error) {
    if (error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ success: false, message: "Email ou mot de passe incorrect" });
    }
    if (error.message === "ACCOUNT_INACTIVE") {
      return res.status(403).json({ success: false, message: "Compte désactivé, contactez l'administrateur" });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Lister tous les semi-admins (admin)
const getSemiAdmins = async (req, res) => {
  try {
    // L'admin voit tous les comptes (actifs + inactifs)
    const admins = await SemiAdminService.getAllSemiAdmins(true);
    res.json({ success: true, data: admins });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Activer / désactiver un semi-admin (admin)
const updateSemiAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body; // boolean attendu

    if (typeof is_active !== "boolean") {
      return res.status(400).json({ success: false, message: "is_active doit être un booléen" });
    }

    const updated = await SemiAdminService.updateSemiAdminStatus(id, is_active);
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error.message === "SEMI_ADMIN_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Semi-admin non trouvé" });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Statistiques (admin)
const getStatistics = async (req, res) => {
  try {
    const stats = await SemiAdminService.getStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Supprimer définitivement un semi-admin (admin seulement)
const deleteSemiAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SemiAdminService.deleteSemiAdmin(id);
    res.json({ success: true, message: "Semi-admin supprimé avec succès", data: deleted });
  } catch (error) {
    if (error.message === "SEMI_ADMIN_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Semi-admin non trouvé" });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const updateSemiAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;
    
    const updated = await SemiAdminService.updateSemiAdmin(id, { name, email, password });
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error.message === "SEMI_ADMIN_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Semi-admin non trouvé" });
    }
    if (error.message === "EMAIL_ALREADY_USED") {
      return res.status(400).json({ success: false, message: "Email déjà utilisé par un autre compte" });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

module.exports = {
  createSemiAdmin,
  loginSemiAdmin,
  getSemiAdmins,
  updateSemiAdminStatus,
  getStatistics,
  deleteSemiAdmin,
  updateSemiAdmin,
};