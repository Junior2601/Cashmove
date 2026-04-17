const AuthorizedNumber = require("../models/authorizedNumber.model");
const Country = require("../models/country.model");
const PaymentMethod = require("../models/paymentMethod.model");
const Agent = require("../models/agent.model"); // Supposons que vous avez ce modèle

// CREATE - Admin seulement
const createAuthorizedNumber = async (req, res) => {
  try {
    const { agent_id, country_id, payment_method_id, number, label, is_active } = req.body;

    if (!agent_id || !country_id || !payment_method_id || !number) {
      return res.status(400).json({
        success: false,
        message: "Agent, pays, méthode de paiement et numéro sont requis",
      });
    }

    // Vérifier si l'agent existe et est actif
    const agent = await Agent.findById(agent_id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent non trouvé",
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

    // Vérifier si la méthode de paiement existe
    const paymentMethod = await PaymentMethod.findById(payment_method_id);
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: "Méthode de paiement non trouvée",
      });
    }

    // Vérifier si la combinaison existe déjà
    const existing = await AuthorizedNumber.existsForCombination(agent_id, country_id, payment_method_id);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Ce numéro autorisé existe déjà pour cet agent, ce pays et cette méthode de paiement",
      });
    }

    const authorizedNumber = await AuthorizedNumber.create({
      agent_id,
      country_id,
      payment_method_id,
      number,
      label,
      is_active
    });

    res.status(201).json({
      success: true,
      data: authorizedNumber,
      message: "Numéro autorisé créé avec succès",
    });
  } catch (error) {
    console.error(error);
    if (error.code === '23503') {
      if (error.constraint === 'authorized_numbers_agent_id_fkey') {
        return res.status(400).json({ 
          success: false, 
          message: "Agent non valide" 
        });
      }
      if (error.constraint === 'authorized_numbers_country_id_fkey') {
        return res.status(400).json({ 
          success: false, 
          message: "Pays non valide" 
        });
      }
      if (error.constraint === 'authorized_numbers_payment_method_id_fkey') {
        return res.status(400).json({ 
          success: false, 
          message: "Méthode de paiement non valide" 
        });
      }
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET ALL - Différenciation selon rôle
const getAllAuthorizedNumbers = async (req, res) => {
  try {
    // Si l'utilisateur est admin, il voit tous les numéros
    if (req.user && req.user.role === 'admin') {
      const authorizedNumbers = await AuthorizedNumber.findAllForAdmin();
      return res.json({
        success: true,
        data: authorizedNumbers,
        message: "Tous les numéros autorisés (actifs et inactifs)",
      });
    }
    
    // Sinon (utilisateur normal ou non authentifié), seulement les actifs
    const authorizedNumbers = await AuthorizedNumber.findAllActive();
    res.json({
      success: true,
      data: authorizedNumbers,
      message: "Numéros autorisés actifs uniquement",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET BY COUNTRY - Différenciation selon rôle
const getAuthorizedNumbersByCountry = async (req, res) => {
  try {
    const { country_id } = req.params;

    // Vérifier si le pays existe
    const country = await Country.findById(country_id);
    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Pays non trouvé",
      });
    }

    // Si l'utilisateur est admin, il voit tous les numéros du pays
    if (req.user && req.user.role === 'admin') {
      const authorizedNumbers = await AuthorizedNumber.findByCountryForAdmin(country_id);
      return res.json({
        success: true,
        data: authorizedNumbers,
        message: `Tous les numéros autorisés pour ${country.name}`,
      });
    }

    // Si le pays est inactif, les utilisateurs normaux n'y ont pas accès
    if (!country.is_active) {
      return res.status(403).json({
        success: false,
        message: "Ce pays n'est pas disponible",
      });
    }
    
    // Pour utilisateurs normaux, seulement les numéros actifs
    const authorizedNumbers = await AuthorizedNumber.findByCountryForUsers(country_id);
    res.json({
      success: true,
      data: authorizedNumbers,
      message: `Numéros autorisés actifs pour ${country.name}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET BY AGENT - Différenciation selon rôle
const getAuthorizedNumbersByAgent = async (req, res) => {
  try {
    const { agent_id } = req.params;

    // Vérifier si l'agent existe
    const agent = await Agent.findById(agent_id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent non trouvé",
      });
    }

    // Si l'utilisateur est admin, il voit tous les numéros de l'agent
    if (req.user && req.user.role === 'admin') {
      const authorizedNumbers = await AuthorizedNumber.findByAgentForAdmin(agent_id);
      return res.json({
        success: true,
        data: authorizedNumbers,
        message: `Tous les numéros autorisés pour l'agent ${agent.name}`,
      });
    }

    // Si l'agent est inactif, les utilisateurs normaux n'y ont pas accès
    if (!agent.is_active) {
      return res.status(403).json({
        success: false,
        message: "Cet agent n'est pas disponible",
      });
    }
    
    // Pour utilisateurs normaux, seulement les numéros actifs
    const authorizedNumbers = await AuthorizedNumber.findByAgentForUsers(agent_id);
    res.json({
      success: true,
      data: authorizedNumbers,
      message: `Numéros autorisés actifs pour l'agent ${agent.name}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET BY PAYMENT METHOD - Admin seulement
const getAuthorizedNumbersByPaymentMethod = async (req, res) => {
  try {
    // Seul l'admin peut voir cette route
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé",
      });
    }

    const { payment_method_id } = req.params;

    // Vérifier si la méthode de paiement existe
    const paymentMethod = await PaymentMethod.findById(payment_method_id);
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: "Méthode de paiement non trouvée",
      });
    }

    const authorizedNumbers = await AuthorizedNumber.findByPaymentMethodForAdmin(payment_method_id);
    res.json({
      success: true,
      data: authorizedNumbers,
      message: `Numéros autorisés pour la méthode ${paymentMethod.method}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET BY ID - Admin voit tout, autres voient seulement si actif
const getAuthorizedNumberById = async (req, res) => {
  try {
    const { id } = req.params;
    const authorizedNumber = await AuthorizedNumber.findById(id);

    if (!authorizedNumber) {
      return res.status(404).json({
        success: false,
        message: "Numéro autorisé non trouvé",
      });
    }

    // Si l'utilisateur n'est pas admin et que le numéro est inactif
    if ((!req.user || req.user.role !== 'admin') && !authorizedNumber.is_active) {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé à ce numéro autorisé",
      });
    }

    res.json({
      success: true,
      data: authorizedNumber,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// UPDATE - Admin seulement
const updateAuthorizedNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const { agent_id, country_id, payment_method_id, number, label, is_active } = req.body;

    // Vérifier si le numéro existe
    const existingNumber = await AuthorizedNumber.findById(id);
    if (!existingNumber) {
      return res.status(404).json({
        success: false,
        message: "Numéro autorisé non trouvé",
      });
    }

    // Si la combinaison change, vérifier l'unicité
    const newAgentId = agent_id || existingNumber.agent_id;
    const newCountryId = country_id || existingNumber.country_id;
    const newPaymentMethodId = payment_method_id || existingNumber.payment_method_id;
    
    if (newAgentId !== existingNumber.agent_id || 
        newCountryId !== existingNumber.country_id || 
        newPaymentMethodId !== existingNumber.payment_method_id) {
      const duplicate = await AuthorizedNumber.existsForCombination(
        newAgentId, 
        newCountryId, 
        newPaymentMethodId,
        id
      );
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: "Cette combinaison agent/pays/méthode de paiement existe déjà",
        });
      }
    }

    const updated = await AuthorizedNumber.update(id, {
      agent_id: newAgentId,
      country_id: newCountryId,
      payment_method_id: newPaymentMethodId,
      number: number || existingNumber.number,
      label: label !== undefined ? label : existingNumber.label,
      is_active: is_active !== undefined ? is_active : existingNumber.is_active
    });

    res.json({
      success: true,
      data: updated,
      message: "Numéro autorisé mis à jour avec succès",
    });
  } catch (error) {
    console.error(error);
    if (error.code === '23503') {
      if (error.constraint === 'authorized_numbers_agent_id_fkey') {
        return res.status(400).json({ 
          success: false, 
          message: "Agent non valide" 
        });
      }
      if (error.constraint === 'authorized_numbers_country_id_fkey') {
        return res.status(400).json({ 
          success: false, 
          message: "Pays non valide" 
        });
      }
      if (error.constraint === 'authorized_numbers_payment_method_id_fkey') {
        return res.status(400).json({ 
          success: false, 
          message: "Méthode de paiement non valide" 
        });
      }
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// SOFT DELETE (Désactiver) - Admin seulement
const disableAuthorizedNumber = async (req, res) => {
  try {
    const { id } = req.params;

    const existingNumber = await AuthorizedNumber.findById(id);
    if (!existingNumber) {
      return res.status(404).json({
        success: false,
        message: "Numéro autorisé non trouvé",
      });
    }

    if (!existingNumber.is_active) {
      return res.status(400).json({
        success: false,
        message: "Ce numéro autorisé est déjà désactivé",
      });
    }

    const disabled = await AuthorizedNumber.softDelete(id);

    res.json({
      success: true,
      data: disabled,
      message: "Numéro autorisé désactivé avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// REACTIVATE - Admin seulement
const reactivateAuthorizedNumber = async (req, res) => {
  try {
    const { id } = req.params;

    const existingNumber = await AuthorizedNumber.findById(id);
    if (!existingNumber) {
      return res.status(404).json({
        success: false,
        message: "Numéro autorisé non trouvé",
      });
    }

    if (existingNumber.is_active) {
      return res.status(400).json({
        success: false,
        message: "Ce numéro autorisé est déjà actif",
      });
    }

    // Vérifier que l'agent associé est actif
    const isAgentActive = await AuthorizedNumber.isAgentActive(existingNumber.agent_id);
    if (!isAgentActive) {
      return res.status(400).json({
        success: false,
        message: "Impossible de réactiver car l'agent associé est inactif",
      });
    }

    const reactivated = await AuthorizedNumber.reactivate(id);

    res.json({
      success: true,
      data: reactivated,
      message: "Numéro autorisé réactivé avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// HARD DELETE (Suppression définitive) - Admin seulement
const deleteAuthorizedNumber = async (req, res) => {
  try {
    const { id } = req.params;

    const existingNumber = await AuthorizedNumber.findById(id);
    if (!existingNumber) {
      return res.status(404).json({
        success: false,
        message: "Numéro autorisé non trouvé",
      });
    }

    await AuthorizedNumber.hardDelete(id);

    res.json({
      success: true,
      message: "Numéro autorisé supprimé définitivement",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

module.exports = {
  createAuthorizedNumber,
  getAllAuthorizedNumbers,
  getAuthorizedNumberById,
  getAuthorizedNumbersByCountry,
  getAuthorizedNumbersByAgent,
  getAuthorizedNumbersByPaymentMethod,
  updateAuthorizedNumber,
  disableAuthorizedNumber,
  reactivateAuthorizedNumber,
  deleteAuthorizedNumber,
};