const PaymentMethodService = require("../services/paymentMethod.service");

const getUserRole = (req) => req.user?.role || null;

const createPaymentMethod = async (req, res) => {
  try {
    const { country_id, method, currency_id, is_active } = req.body;
    if (!country_id || !method || !currency_id) {
      return res.status(400).json({
        success: false,
        message: "Pays, méthode de paiement et devise sont requis",
      });
    }

    const paymentMethod = await PaymentMethodService.createPaymentMethod({
      country_id,
      method,
      currency_id,
      is_active,
    });

    res.status(201).json({
      success: true,
      data: paymentMethod,
      message: "Méthode de paiement créée avec succès",
    });
  } catch (error) {
    console.error(error);
    const errorMap = {
      "Pays non trouvé": 404,
      "Devise non valide": 400,
      "Cette méthode de paiement existe déjà pour ce pays": 400,
    };
    const status = errorMap[error.message] || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

const getAllPaymentMethods = async (req, res) => {
  try {
    const role = getUserRole(req);
    const methods = await PaymentMethodService.getAllPaymentMethods(role);
    res.json({
      success: true,
      data: methods,
      message: role === "admin" ? "Toutes les méthodes de paiement" : "Méthodes actives uniquement",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getPaymentMethodById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getUserRole(req);
    const method = await PaymentMethodService.getPaymentMethodById(id, role);
    res.json({ success: true, data: method });
  } catch (error) {
    if (error.message === "Méthode de paiement non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès non autorisé à cette méthode de paiement") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getPaymentMethodsByCountry = async (req, res) => {
  try {
    const { countryId } = req.params;
    const role = getUserRole(req);
    const methods = await PaymentMethodService.getPaymentMethodsByCountry(countryId, role);
    res.json({ success: true, data: methods });
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

const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { country_id, method, currency_id, is_active } = req.body;
    const role = getUserRole(req);

    const updated = await PaymentMethodService.updatePaymentMethod(
      id,
      { country_id, method, currency_id, is_active },
      role
    );

    res.json({
      success: true,
      data: updated,
      message: "Méthode de paiement mise à jour avec succès",
    });
  } catch (error) {
    console.error(error);
    const errorMap = {
      "Accès refusé": 403,
      "Méthode de paiement non trouvée": 404,
      "Pays non valide": 400,
      "Devise non valide": 400,
      "Cette méthode de paiement existe déjà pour ce pays": 400,
    };
    const status = errorMap[error.message] || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

const disablePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getUserRole(req);
    const disabled = await PaymentMethodService.disablePaymentMethod(id, role);
    res.json({ success: true, data: disabled, message: "Méthode de paiement désactivée" });
  } catch (error) {
    if (error.message === "Méthode de paiement non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Cette méthode de paiement est déjà désactivée") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const reactivatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getUserRole(req);
    const reactivated = await PaymentMethodService.reactivatePaymentMethod(id, role);
    res.json({ success: true, data: reactivated, message: "Méthode de paiement réactivée" });
  } catch (error) {
    if (error.message === "Méthode de paiement non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Cette méthode de paiement est déjà active") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.message === "Impossible de réactiver car le pays associé est inactif") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getUserRole(req);
    await PaymentMethodService.deletePaymentMethod(id, role);
    res.json({ success: true, message: "Méthode de paiement supprimée définitivement" });
  } catch (error) {
    if (error.message === "Méthode de paiement non trouvée") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

module.exports = {
  createPaymentMethod,
  getAllPaymentMethods,
  getPaymentMethodById,
  getPaymentMethodsByCountry,
  updatePaymentMethod,
  disablePaymentMethod,
  reactivatePaymentMethod,
  deletePaymentMethod,
};