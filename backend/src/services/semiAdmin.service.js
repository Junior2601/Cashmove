const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SemiAdminModel = require("../models/semiAdmin.model");

class SemiAdminService {
  // Création d'un semi-admin (hash password, validation email unique)
  static async createSemiAdmin(name, email, password) {
    // Vérifier si l'email existe déjà
    const existing = await SemiAdminModel.findByEmail(email);
    if (existing) {
      throw new Error("EMAIL_ALREADY_USED");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await SemiAdminModel.create({
      name,
      email,
      password: hashedPassword,
    });
    return newAdmin;
  }

  // Login : vérifie email, mot de passe, et compte actif
  static async loginSemiAdmin(email, password) {
    const semiAdmin = await SemiAdminModel.findByEmail(email);
    if (!semiAdmin) {
      throw new Error("INVALID_CREDENTIALS");
    }
    if (!semiAdmin.is_active) {
      throw new Error("ACCOUNT_INACTIVE");
    }

    const isMatch = await bcrypt.compare(password, semiAdmin.password);
    if (!isMatch) {
      throw new Error("INVALID_CREDENTIALS");
    }

    // Génération du token JWT (rôle "semi-admin")
    const token = jwt.sign(
      { id: semiAdmin.id, role: "semi-admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return { token, semiAdmin: { id: semiAdmin.id, name: semiAdmin.name, email: semiAdmin.email, is_active: semiAdmin.is_active } };
  }

  // Récupérer tous les semi-admins (admin peut voir tous les statuts)
  static async getAllSemiAdmins(includeInactive = true) {
    return await SemiAdminModel.findAll(includeInactive);
  }

  // Activer / désactiver un semi-admin
  static async updateSemiAdminStatus(id, isActive) {
    const updated = await SemiAdminModel.updateStatus(id, isActive);
    if (!updated) {
      throw new Error("SEMI_ADMIN_NOT_FOUND");
    }
    return updated;
  }

  // Statistiques : total, actifs, inactifs
  static async getStatistics() {
    return await SemiAdminModel.getStats();
  }

  static async deleteSemiAdmin(id) {
    const deleted = await SemiAdminModel.deleteById(id);
    if (!deleted) {
      throw new Error("SEMI_ADMIN_NOT_FOUND");
    }
    return deleted;
  }
}

module.exports = SemiAdminService;