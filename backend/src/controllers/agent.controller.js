const Agent = require("../models/agent.model");
const Country = require("../models/country.model");
const bcrypt = require("bcrypt");

// CREATE - Admin seulement
const createAgent = async (req, res) => {
  try {
    const { name, email, password, country_id, can_process, is_active } = req.body;

    if (!name || !email || !password || !country_id) {
      return res.status(400).json({
        success: false,
        message: "Nom, email, mot de passe et pays sont requis",
      });
    }

    // Vérifier si l'email existe déjà
    const existing = await Agent.emailExists(email);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Cet email est déjà utilisé",
      });
    }

    // Vérifier si le pays existe
    const country = await Country.findById(country_id);
    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Pays non trouvé",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const agent = await Agent.create({
      name,
      email,
      password: hashedPassword,
      country_id,
      can_process: can_process || false,
      is_active: is_active !== undefined ? is_active : true
    });

    res.status(201).json({
      success: true,
      data: agent,
      message: "Agent créé avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET ALL - Différenciation selon rôle
const getAgents = async (req, res) => {
  try {
    // Admin voit tous les agents
    if (req.user.role === 'admin') {
      const agents = await Agent.findAllForAdmin();
      return res.json({
        success: true,
        data: agents,
        message: "Tous les agents",
      });
    }
    
    // Semi-admin voit tous les agents actifs
    if (req.user.role === 'semi_admin') {
      const agents = await Agent.findAllForSemiAdmin();
      return res.json({
        success: true,
        data: agents,
        message: "Liste des agents actifs",
      });
    }
    
    // Agent voit tous les autres agents actifs
    if (req.user.role === 'agent') {
      const agents = await Agent.findAllForAgent(req.user.id);
      return res.json({
        success: true,
        data: agents,
        message: "Liste des autres agents",
      });
    }
    
    return res.status(403).json({
      success: false,
      message: "Rôle non autorisé",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET BY ID - Selon les permissions
const getAgentById = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await Agent.findById(id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent non trouvé",
      });
    }

    // Admin peut voir n'importe quel agent
    if (req.user.role === 'admin') {
      return res.json({
        success: true,
        data: agent,
      });
    }
    
    // Semi-admin peut voir n'importe quel agent (seulement s'il est actif)
    if (req.user.role === 'semi_admin') {
      if (!agent.is_active) {
        return res.status(403).json({
          success: false,
          message: "Cet agent n'est pas accessible",
        });
      }
      return res.json({
        success: true,
        data: agent,
      });
    }
    
    // Agent ne peut voir que son propre compte
    if (req.user.role === 'agent') {
      if (parseInt(id) !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Vous ne pouvez voir que votre propre compte",
        });
      }
      return res.json({
        success: true,
        data: agent,
      });
    }
    
    return res.status(403).json({
      success: false,
      message: "Accès non autorisé",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET CURRENT AGENT (profil)
const getCurrentAgent = async (req, res) => {
  try {
    // Seul un agent peut voir son propre profil
    if (req.user.role !== 'agent') {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé",
      });
    }

    const agent = await Agent.findById(req.user.id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent non trouvé",
      });
    }

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// UPDATE - Admin seulement
const updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, country_id, can_process, is_active } = req.body;

    // Vérifier si l'agent existe
    const existingAgent = await Agent.findById(id);
    if (!existingAgent) {
      return res.status(404).json({
        success: false,
        message: "Agent non trouvé",
      });
    }

    // Vérifier si l'email existe déjà (pour un autre agent)
    if (email && email !== existingAgent.email) {
      const emailExists = await Agent.emailExists(email, id);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Cet email est déjà utilisé par un autre agent",
        });
      }
    }

    // Vérifier si le pays existe
    if (country_id) {
      const country = await Country.findById(country_id);
      if (!country) {
        return res.status(404).json({
          success: false,
          message: "Pays non trouvé",
        });
      }
    }

    const updated = await Agent.update(id, {
      name: name || existingAgent.name,
      email: email || existingAgent.email,
      country_id: country_id || existingAgent.country_id,
      can_process: can_process !== undefined ? can_process : existingAgent.can_process,
      is_active: is_active !== undefined ? is_active : existingAgent.is_active
    });

    res.json({
      success: true,
      data: updated,
      message: "Agent mis à jour avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// UPDATE PASSWORD - Agent ou Admin
const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;

    // Vérifier les permissions
    if (req.user.role !== 'admin' && req.user.role !== 'agent') {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé",
      });
    }

    // Si c'est un agent, il ne peut changer que son propre mot de passe
    if (req.user.role === 'agent' && parseInt(id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez changer que votre propre mot de passe",
      });
    }

    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent non trouvé",
      });
    }

    // Pour un agent, vérifier l'ancien mot de passe
    if (req.user.role === 'agent') {
      if (!current_password) {
        return res.status(400).json({
          success: false,
          message: "Mot de passe actuel requis",
        });
      }
      
      const isMatch = await bcrypt.compare(current_password, agent.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Mot de passe actuel incorrect",
        });
      }
    }

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe doit contenir au moins 6 caractères",
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await Agent.updatePassword(id, hashedPassword);

    res.json({
      success: true,
      message: "Mot de passe mis à jour avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// ACTIVATE / DEACTIVATE - Admin seulement
const toggleAgentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({
        success: false,
        message: "Le statut is_active est requis",
      });
    }

    const existingAgent = await Agent.findById(id);
    if (!existingAgent) {
      return res.status(404).json({
        success: false,
        message: "Agent non trouvé",
      });
    }

    const updated = await Agent.updateStatus(id, is_active);

    res.json({
      success: true,
      data: updated,
      message: `Agent ${is_active ? 'activé' : 'désactivé'} avec succès`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// UPDATE CAN PROCESS - Admin seulement
const toggleCanProcess = async (req, res) => {
  try {
    const { id } = req.params;
    const { can_process } = req.body;

    if (can_process === undefined) {
      return res.status(400).json({
        success: false,
        message: "La permission can_process est requise",
      });
    }

    const existingAgent = await Agent.findById(id);
    if (!existingAgent) {
      return res.status(404).json({
        success: false,
        message: "Agent non trouvé",
      });
    }

    const updated = await Agent.updateCanProcess(id, can_process);

    res.json({
      success: true,
      data: updated,
      message: `Permission de traiter les transactions ${can_process ? 'accordée' : 'retirée'} avec succès`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// SOFT DELETE - Admin seulement
const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;

    const existingAgent = await Agent.findById(id);
    if (!existingAgent) {
      return res.status(404).json({
        success: false,
        message: "Agent non trouvé",
      });
    }

    await Agent.softDelete(id);

    res.json({
      success: true,
      message: "Agent supprimé avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// HARD DELETE - Admin seulement
const hardDeleteAgent = async (req, res) => {
  try {
    const { id } = req.params;

    const existingAgent = await Agent.findById(id);
    if (!existingAgent) {
      return res.status(404).json({
        success: false,
        message: "Agent non trouvé",
      });
    }

    await Agent.hardDelete(id);

    res.json({
      success: true,
      message: "Agent supprimé définitivement",
    });
  } catch (error) {
    console.error(error);
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: "Impossible de supprimer cet agent car il a des données associées (balances, transactions, etc.)",
      });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET AGENTS BY COUNTRY - Admin seulement
const getAgentsByCountry = async (req, res) => {
  try {
    const { country_id } = req.params;

    const country = await Country.findById(country_id);
    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Pays non trouvé",
      });
    }

    const agents = await Agent.findByCountry(country_id);

    res.json({
      success: true,
      data: agents,
      message: `Agents pour ${country.name}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// COUNT AGENTS BY COUNTRY - Admin et semi-admin
const countAgentsByCountry = async (req, res) => {
  try {
    const { country_id } = req.params;

    const country = await Country.findById(country_id);
    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Pays non trouvé",
      });
    }

    const count = await Agent.countByCountry(country_id);

    res.json({
      success: true,
      data: {
        country_id: parseInt(country_id),
        country_name: country.name,
        active_agents_count: count,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

module.exports = {
  createAgent,
  getAgents,
  getAgentById,
  getCurrentAgent,
  updateAgent,
  updatePassword,
  toggleAgentStatus,
  toggleCanProcess,
  deleteAgent,
  hardDeleteAgent,
  getAgentsByCountry,
  countAgentsByCountry,
};