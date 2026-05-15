const CountryService = require("../services/country.service");

const getUserRole = (req) => req.user?.role || null;

const createCountry = async (req, res) => {
  try {
    const { name, code, phone_prefix, currency_id, is_active } = req.body;
    if (!name || !code || !phone_prefix || !currency_id) {
      return res.status(400).json({
        success: false,
        message: "Nom, code, préfixe téléphone et devise sont requis",
      });
    }

    const country = await CountryService.createCountry({
      name,
      code,
      phone_prefix,
      currency_id,
      is_active,
    });

    res.status(201).json({
      success: true,
      data: country,
      message: "Pays créé avec succès",
    });
  } catch (error) {
    console.error(error);
    const messages = {
      "Ce nom de pays existe déjà": 400,
      "Ce code de pays existe déjà": 400,
      "Devise non valide": 400,
    };
    const status = messages[error.message] || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

const getCountries = async (req, res) => {
  try {
    const role = getUserRole(req);
    const countries = await CountryService.getCountries(role);
    res.json({
      success: true,
      data: countries,
      message: role === "admin" ? "Tous les pays" : "Pays actifs uniquement",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getCountryById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getUserRole(req);
    const country = await CountryService.getCountryById(id, role);
    res.json({ success: true, data: country });
  } catch (error) {
    if (error.message === "Pays non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès non autorisé à ce pays") {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, phone_prefix, currency_id, is_active } = req.body;
    const role = getUserRole(req);

    const updated = await CountryService.updateCountry(
      id,
      { name, code, phone_prefix, currency_id, is_active },
      role
    );

    res.json({ success: true, data: updated, message: "Pays mis à jour avec succès" });
  } catch (error) {
    console.error(error);
    const errorMap = {
      "Pays non trouvé": 404,
      "Accès refusé": 403,
      "Ce nom de pays existe déjà": 400,
      "Ce code de pays existe déjà": 400,
      "Devise non valide": 400,
    };
    const status = errorMap[error.message] || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

const disableCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getUserRole(req);
    const disabled = await CountryService.disableCountry(id, role);
    res.json({ success: true, data: disabled, message: "Pays désactivé avec succès" });
  } catch (error) {
    if (error.message === "Pays non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Ce pays est déjà désactivé") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const reactivateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getUserRole(req);
    const reactivated = await CountryService.reactivateCountry(id, role);
    res.json({ success: true, data: reactivated, message: "Pays réactivé avec succès" });
  } catch (error) {
    if (error.message === "Pays non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Ce pays est déjà actif") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getUserRole(req);
    await CountryService.deleteCountry(id, role);
    res.json({ success: true, message: "Pays supprimé définitivement" });
  } catch (error) {
    if (error.message === "Pays non trouvé") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Accès refusé") {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === "Impossible de supprimer ce pays car il est utilisé par d'autres entités") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

module.exports = {
  createCountry,
  getCountries,
  getCountryById,
  updateCountry,
  disableCountry,
  reactivateCountry,
  deleteCountry,
};