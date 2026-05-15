const AuthorizedNumberService = require("../services/authorizedNumber.service");

const getUserRole = (req) => req.user?.role || null;

const createAuthorizedNumber = async (req, res) => {
  try {
    const { agent_id, country_id, payment_method_id, number, label, is_active } = req.body;
    if (!agent_id || !country_id || !payment_method_id || !number) {
      return res.status(400).json({
        success: false,
        message: "Agent, pays, méthode de paiement et numéro sont requis",
      });
    }
    const created = await AuthorizedNumberService.createAuthorizedNumber(
      { agent_id, country_id, payment_method_id, number, label, is_active },
      getUserRole(req)
    );
    res.status(201).json({
      success: true,
      data: created,
      message: "Numéro autorisé créé avec succès",
    });
  } catch (error) {
    console.error(error);
    const errorMap = {
      "Accès refusé": 403,
      "Agent non trouvé": 404,
      "Pays non trouvé": 404,
      "Méthode de paiement non trouvée": 404,
      "Cette combinaison agent/pays/méthode de paiement existe déjà": 400,
    };
    const status = errorMap[error.message] || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

const getAllAuthorizedNumbers = async (req, res) => {
  try {
    const data = await AuthorizedNumberService.getAllAuthorizedNumbers(getUserRole(req));
    res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getAuthorizedNumberById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await AuthorizedNumberService.getAuthorizedNumberById(id, getUserRole(req));
    res.json({ success: true, data });
  } catch (error) {
    if (error.message === "Numéro autorisé non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès non autorisé à ce numéro autorisé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getAuthorizedNumbersByCountry = async (req, res) => {
  try {
    const { country_id } = req.params;
    const data = await AuthorizedNumberService.getAuthorizedNumbersByCountry(country_id, getUserRole(req));
    res.json({ success: true, data });
  } catch (error) {
    if (error.message === "Pays non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Ce pays n'est pas disponible") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getAuthorizedNumbersByAgent = async (req, res) => {
  try {
    const { agent_id } = req.params;
    const data = await AuthorizedNumberService.getAuthorizedNumbersByAgent(agent_id, getUserRole(req));
    res.json({ success: true, data });
  } catch (error) {
    if (error.message === "Agent non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Cet agent n'est pas disponible") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getAuthorizedNumbersByPaymentMethod = async (req, res) => {
  try {
    const { payment_method_id } = req.params;
    const data = await AuthorizedNumberService.getAuthorizedNumbersByPaymentMethod(payment_method_id, getUserRole(req));
    res.json({ success: true, data });
  } catch (error) {
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Méthode de paiement non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const updateAuthorizedNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const { agent_id, country_id, payment_method_id, number, label, is_active } = req.body;
    const updated = await AuthorizedNumberService.updateAuthorizedNumber(
      id,
      { agent_id, country_id, payment_method_id, number, label, is_active },
      getUserRole(req)
    );
    res.json({ success: true, data: updated, message: "Numéro autorisé mis à jour" });
  } catch (error) {
    console.error(error);
    const errorMap = {
      "Accès refusé": 403,
      "Numéro autorisé non trouvé": 404,
      "Agent non valide": 400,
      "Pays non valide": 400,
      "Méthode de paiement non valide": 400,
      "Cette combinaison agent/pays/méthode de paiement existe déjà": 400,
    };
    const status = errorMap[error.message] || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

const disableAuthorizedNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const disabled = await AuthorizedNumberService.disableAuthorizedNumber(id, getUserRole(req));
    res.json({ success: true, data: disabled, message: "Numéro autorisé désactivé" });
  } catch (error) {
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Numéro autorisé non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Ce numéro autorisé est déjà désactivé") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const reactivateAuthorizedNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const reactivated = await AuthorizedNumberService.reactivateAuthorizedNumber(id, getUserRole(req));
    res.json({ success: true, data: reactivated, message: "Numéro autorisé réactivé" });
  } catch (error) {
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Numéro autorisé non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Ce numéro autorisé est déjà actif") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.message === "Impossible de réactiver car l'agent associé est inactif") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const deleteAuthorizedNumber = async (req, res) => {
  try {
    const { id } = req.params;
    await AuthorizedNumberService.deleteAuthorizedNumber(id, getUserRole(req));
    res.json({ success: true, message: "Numéro autorisé supprimé définitivement" });
  } catch (error) {
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Numéro autorisé non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
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