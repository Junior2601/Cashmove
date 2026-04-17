const Country = require("../models/country.model");

// CREATE - Admin seulement
const createCountry = async (req, res) => {
  try {
    const { name, code, phone_prefix, currency_id, is_active } = req.body;

    if (!name || !code || !phone_prefix || !currency_id) {
      return res.status(400).json({
        success: false,
        message: "Nom, code, préfixe téléphone et devise sont requis",
      });
    }

    const country = await Country.create({
      name,
      code,
      phone_prefix,
      currency_id,
      is_active
    });

    res.status(201).json({
      success: true,
      data: country,
      message: "Pays créé avec succès",
    });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      if (error.constraint === 'countries_name_key') {
        return res.status(400).json({ 
          success: false, 
          message: "Ce nom de pays existe déjà" 
        });
      }
      if (error.constraint === 'countries_code_key') {
        return res.status(400).json({ 
          success: false, 
          message: "Ce code de pays existe déjà" 
        });
      }
    }
    if (error.code === '23503') {
      return res.status(400).json({ 
        success: false, 
        message: "Devise non valide" 
      });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET ALL - Différenciation selon rôle
const getCountries = async (req, res) => {
  try {
    // Si l'utilisateur est admin, il voit tous les pays
    if (req.user && req.user.role === 'admin') {
      const countries = await Country.findAllForAdmin();
      return res.json({
        success: true,
        data: countries,
        message: "Tous les pays (actifs et inactifs)",
      });
    }
    
    // Sinon (utilisateur normal ou non authentifié), seulement les actifs
    const countries = await Country.findAllActive();
    res.json({
      success: true,
      data: countries,
      message: "Pays actifs uniquement",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET BY ID - Admin voit tout, autres voient seulement si actif
const getCountryById = async (req, res) => {
  try {
    const { id } = req.params;
    const country = await Country.findById(id);

    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Pays non trouvé",
      });
    }

    // Si l'utilisateur n'est pas admin et que le pays est inactif
    if ((!req.user || req.user.role !== 'admin') && !country.is_active) {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé à ce pays",
      });
    }

    res.json({
      success: true,
      data: country,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// UPDATE - Admin seulement
const updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, phone_prefix, currency_id, is_active } = req.body;

    // Vérifier si le pays existe
    const existingCountry = await Country.findById(id);
    if (!existingCountry) {
      return res.status(404).json({
        success: false,
        message: "Pays non trouvé",
      });
    }

    const updated = await Country.update(id, {
      name,
      code,
      phone_prefix,
      currency_id,
      is_active
    });

    res.json({
      success: true,
      data: updated,
      message: "Pays mis à jour avec succès",
    });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      if (error.constraint === 'countries_name_key') {
        return res.status(400).json({ 
          success: false, 
          message: "Ce nom de pays existe déjà" 
        });
      }
      if (error.constraint === 'countries_code_key') {
        return res.status(400).json({ 
          success: false, 
          message: "Ce code de pays existe déjà" 
        });
      }
    }
    if (error.code === '23503') {
      return res.status(400).json({ 
        success: false, 
        message: "Devise non valide" 
      });
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// SOFT DELETE (Désactiver) - Admin seulement
const disableCountry = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCountry = await Country.findById(id);
    if (!existingCountry) {
      return res.status(404).json({
        success: false,
        message: "Pays non trouvé",
      });
    }

    if (!existingCountry.is_active) {
      return res.status(400).json({
        success: false,
        message: "Ce pays est déjà désactivé",
      });
    }

    const disabled = await Country.softDelete(id);

    res.json({
      success: true,
      data: disabled,
      message: "Pays désactivé avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// REACTIVATE - Admin seulement
const reactivateCountry = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCountry = await Country.findById(id);
    if (!existingCountry) {
      return res.status(404).json({
        success: false,
        message: "Pays non trouvé",
      });
    }

    if (existingCountry.is_active) {
      return res.status(400).json({
        success: false,
        message: "Ce pays est déjà actif",
      });
    }

    const reactivated = await Country.reactivate(id);

    res.json({
      success: true,
      data: reactivated,
      message: "Pays réactivé avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// HARD DELETE (Suppression définitive) - Admin seulement
const deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCountry = await Country.findById(id);
    if (!existingCountry) {
      return res.status(404).json({
        success: false,
        message: "Pays non trouvé",
      });
    }

    await Country.hardDelete(id);

    res.json({
      success: true,
      message: "Pays supprimé définitivement",
    });
  } catch (error) {
    console.error(error);
    if (error.code === '23503') {
      return res.status(400).json({ 
        success: false, 
        message: "Impossible de supprimer ce pays car il est utilisé par d'autres entités" 
      });
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