const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");

const JWT_SECRET = process.env.JWT_SECRET || "votre_secret";

// Création d'un admin
const createAdmin = async (adminData) => {
  const { name, email, password } = adminData;

  // Vérifier si l'email existe déjà
  const existing = await Admin.findByEmail(email);
  if (existing) {
    throw new Error("Email déjà utilisé");
  }

  // Hacher le mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  // Créer l'admin
  const admin = await Admin.create({
    name,
    email,
    password: hashedPassword,
  });

  return admin;
};

// Récupérer tous les admins
const getAllAdmins = async () => {
  return await Admin.findAll();
};

// Supprimer un admin par id
const deleteAdmin = async (id) => {
  await Admin.delete(id);
};

// Connexion (login)
const loginAdmin = async (email, password) => {
  // Vérifier si l'admin existe
  const admin = await Admin.findByEmail(email);
  if (!admin) {
    throw new Error("Email ou mot de passe incorrect");
  }

  // Comparer les mots de passe
  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) {
    throw new Error("Email ou mot de passe incorrect");
  }

  // Générer un token JWT
  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: "admin" },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  return {
    token,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      created_at: admin.created_at,
    },
  };
};

module.exports = {
  createAdmin,
  getAllAdmins,
  deleteAdmin,
  loginAdmin,
};