const PaymentMethod = require("../models/paymentMethod.model");
const Country = require("../models/country.model");

// CREATE - Admin seulement
const createPaymentMethod = async (req, res) => {
  try {
    const { country_id, method, currency_id, is_active } = req.body;

    if (!country_id || !method || !currency_id) {
      return res.status(400).json({
        success: false,
        message: "Pays, méthode de paiement et devise sont requis",
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

    // Vérifier si la méthode existe déjà pour ce pays
    const existing = await PaymentMethod.existsInCountry(country_id, method);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Cette méthode de paiement existe déjà pour ce pays",
      });
    }

    const paymentMethod = await PaymentMethod.create({
      country_id,
      method,
      currency_id,
      is_active
    });

    res.status(201).json({
      success: true,
      data: paymentMethod,
      message: "Méthode de paiement créée avec succès",
    });
  } catch (error) {
    console.error(error);
    if (error.code === '23503') {
      if (error.constraint === 'payment_methods_country_id_fkey') {
        return res.status(400).json({ 
          success: false, 
          message: "Pays non valide" 
        });
      }
      if (error.constraint === 'payment_methods_currency_id_fkey') {
        return res.status(400).json({ 
          success: false, 
          message: "Devise non valide" 
        });
      }
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET ALL - Différenciation selon rôle
const getAllPaymentMethods = async (req, res) => {
  try {
    // Si l'utilisateur est admin, il voit toutes les méthodes
    if (req.user && req.user.role === 'admin') {
      const paymentMethods = await PaymentMethod.findAllForAdmin();
      return res.json({
        success: true,
        data: paymentMethods,
        message: "Toutes les méthodes de paiement (actives et inactives)",
      });
    }
    
    // Sinon (utilisateur normal ou non authentifié), seulement les actives
    const paymentMethods = await PaymentMethod.findAllActive();
    res.json({
      success: true,
      data: paymentMethods,
      message: "Méthodes de paiement actives uniquement",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET BY COUNTRY - Différenciation selon rôle
const getPaymentMethodsByCountry = async (req, res) => {
  try {
    const { countryId } = req.params;

    // Vérifier si le pays existe
    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({
        success: false,
        message: "Pays non trouvé",
      });
    }

    // Si l'utilisateur est admin, il voit toutes les méthodes du pays
    if (req.user && req.user.role === 'admin') {
      const paymentMethods = await PaymentMethod.findByCountryForAdmin(countryId);
      return res.json({
        success: true,
        data: paymentMethods,
        message: `Toutes les méthodes de paiement pour ${country.name}`,
      });
    }

    // Si le pays est inactif, les utilisateurs normaux n'y ont pas accès
    if (!country.is_active) {
      return res.status(403).json({
        success: false,
        message: "Ce pays n'est pas disponible",
      });
    }
    
    // Pour utilisateurs normaux, seulement les méthodes actives
    const paymentMethods = await PaymentMethod.findByCountryForUsers(countryId);
    res.json({
      success: true,
      data: paymentMethods,
      message: `Méthodes de paiement actives pour ${country.name}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// GET BY ID - Admin voit tout, autres voient seulement si active
const getPaymentMethodById = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentMethod = await PaymentMethod.findById(id);

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: "Méthode de paiement non trouvée",
      });
    }

    // Si l'utilisateur n'est pas admin et que la méthode est inactive
    if ((!req.user || req.user.role !== 'admin') && !paymentMethod.is_active) {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé à cette méthode de paiement",
      });
    }

    res.json({
      success: true,
      data: paymentMethod,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// UPDATE - Admin seulement
const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { country_id, method, currency_id, is_active } = req.body;

    // Vérifier si la méthode existe
    const existingMethod = await PaymentMethod.findById(id);
    if (!existingMethod) {
      return res.status(404).json({
        success: false,
        message: "Méthode de paiement non trouvée",
      });
    }

    // Si le pays change, vérifier l'unicité
    if (country_id && method && (country_id !== existingMethod.country_id || method !== existingMethod.method)) {
      const duplicate = await PaymentMethod.existsInCountry(country_id, method);
      if (duplicate && duplicate.id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: "Cette méthode de paiement existe déjà pour ce pays",
        });
      }
    }

    const updated = await PaymentMethod.update(id, {
      country_id: country_id || existingMethod.country_id,
      method: method || existingMethod.method,
      currency_id: currency_id || existingMethod.currency_id,
      is_active: is_active !== undefined ? is_active : existingMethod.is_active
    });

    res.json({
      success: true,
      data: updated,
      message: "Méthode de paiement mise à jour avec succès",
    });
  } catch (error) {
    console.error(error);
    if (error.code === '23503') {
      if (error.constraint === 'payment_methods_country_id_fkey') {
        return res.status(400).json({ 
          success: false, 
          message: "Pays non valide" 
        });
      }
      if (error.constraint === 'payment_methods_currency_id_fkey') {
        return res.status(400).json({ 
          success: false, 
          message: "Devise non valide" 
        });
      }
    }
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// SOFT DELETE (Désactiver) - Admin seulement
const disablePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;

    const existingMethod = await PaymentMethod.findById(id);
    if (!existingMethod) {
      return res.status(404).json({
        success: false,
        message: "Méthode de paiement non trouvée",
      });
    }

    if (!existingMethod.is_active) {
      return res.status(400).json({
        success: false,
        message: "Cette méthode de paiement est déjà désactivée",
      });
    }

    const disabled = await PaymentMethod.softDelete(id);

    res.json({
      success: true,
      data: disabled,
      message: "Méthode de paiement désactivée avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// REACTIVATE - Admin seulement
const reactivatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;

    const existingMethod = await PaymentMethod.findById(id);
    if (!existingMethod) {
      return res.status(404).json({
        success: false,
        message: "Méthode de paiement non trouvée",
      });
    }

    if (existingMethod.is_active) {
      return res.status(400).json({
        success: false,
        message: "Cette méthode de paiement est déjà active",
      });
    }

    // Vérifier que le pays associé est actif
    const country = await Country.findById(existingMethod.country_id);
    if (!country.is_active) {
      return res.status(400).json({
        success: false,
        message: "Impossible de réactiver car le pays associé est inactif",
      });
    }

    const reactivated = await PaymentMethod.reactivate(id);

    res.json({
      success: true,
      data: reactivated,
      message: "Méthode de paiement réactivée avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// HARD DELETE (Suppression définitive) - Admin seulement
const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;

    const existingMethod = await PaymentMethod.findById(id);
    if (!existingMethod) {
      return res.status(404).json({
        success: false,
        message: "Méthode de paiement non trouvée",
      });
    }

    await PaymentMethod.hardDelete(id);

    res.json({
      success: true,
      message: "Méthode de paiement supprimée définitivement",
    });
  } catch (error) {
    console.error(error);
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