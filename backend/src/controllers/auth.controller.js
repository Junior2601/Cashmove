const Admin = require("../models/admin.model");
const SemiAdmin = require("../models/semiAdmin.model");
const Agent = require("../models/agent.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// 🔐 GENERATE TOKEN
const generateToken = (user, role) => {
  return jwt.sign(
    {
      id: user.id,
      role: role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ======================
// 🔹 LOGIN ADMIN
// ======================
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe requis",
      });
    }

    // chercher admin
    const admin = await Admin.findByEmail(email);

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Identifiants invalides",
      });
    }

    // vérifier mot de passe
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Identifiants invalides",
      });
    }

    // générer token
    const token = generateToken(admin, "admin");

    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: "admin",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// ======================
// 🔹 LOGIN SEMI ADMIN
// ======================
const loginSemiAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe requis",
      });
    }

    const user = await SemiAdmin.findByEmail(email);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Identifiants invalides",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Identifiants invalides",
      });
    }

    const token = generateToken(user, "semi-admin");

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "semi-admin",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// ======================
// 🔹 LOGIN AGENT
// ======================
const loginAgent = async (req, res) => {
  try {
    const { email, password } = req.body;

    // validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe requis",
      });
    }

    // chercher agent
    const agent = await Agent.findByEmail(email);

    if (!agent) {
      return res.status(400).json({
        success: false,
        message: "Identifiants invalides",
      });
    }

    // vérifier si l'agent est actif
    if (!agent.is_active) {
      return res.status(401).json({
        success: false,
        message: "Compte désactivé. Veuillez contacter l'administrateur.",
      });
    }

    // vérifier mot de passe
    const isMatch = await bcrypt.compare(password, agent.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Identifiants invalides",
      });
    }

    // générer token
    const token = generateToken(agent, "agent");

    res.json({
      success: true,
      token,
      user: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        country_id: agent.country_id,
        can_process: agent.can_process,
        role: "agent",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

// ======================
// 🔹 LOGIN GENERIC (optionnel - selon le rôle)
// ======================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe requis",
      });
    }

    // Essayer de trouver l'utilisateur dans différentes tables
    let user = null;
    let role = null;

    // Chercher parmi les admins
    user = await Admin.findByEmail(email);
    if (user) {
      role = "admin";
    }

    // Chercher parmi les semi-admins
    if (!user) {
      user = await SemiAdmin.findByEmail(email);
      if (user) {
        role = "semi-admin";
      }
    }

    // Chercher parmi les agents
    if (!user) {
      user = await Agent.findByEmail(email);
      if (user) {
        role = "agent";
        // Vérifier si l'agent est actif
        if (!user.is_active) {
          return res.status(401).json({
            success: false,
            message: "Compte désactivé. Veuillez contacter l'administrateur.",
          });
        }
      }
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Identifiants invalides",
      });
    }

    // vérifier mot de passe
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Identifiants invalides",
      });
    }

    // générer token
    const token = generateToken(user, role);

    // Préparer la réponse selon le rôle
    const responseData = {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: role,
      },
    };

    // Ajouter des informations spécifiques pour l'agent
    if (role === "agent") {
      responseData.user.country_id = user.country_id;
      responseData.user.can_process = user.can_process;
    }

    res.json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

module.exports = {
  loginAdmin,
  loginSemiAdmin,
  loginAgent,
  login, // login générique optionnel
};