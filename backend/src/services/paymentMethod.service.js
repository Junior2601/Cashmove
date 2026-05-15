const db = require("../config/db");
const PaymentMethodModel = require("../models/paymentMethod.model");
const CountryModel = require("../models/country.model");
const CurrencyModel = require("../models/currency.model");

class PaymentMethodService {
  // CREATE - sans transaction (vérifications + insertion unique)
  static async createPaymentMethod(data) {
    // Vérifier que le pays existe
    const country = await CountryModel.findById(data.country_id);
    if (!country) throw new Error("Pays non trouvé");

    // Vérifier que la devise existe
    const currency = await CurrencyModel.findById(data.currency_id);
    if (!currency) throw new Error("Devise non valide");

    // Vérifier qu'il n'existe pas déjà la même méthode pour ce pays
    const existing = await PaymentMethodModel.existsInCountry(data.country_id, data.method);
    if (existing) throw new Error("Cette méthode de paiement existe déjà pour ce pays");

    // Insertion directe
    return await PaymentMethodModel.create(data);
  }

  // READ
  static async getAllPaymentMethods(userRole) {
    if (userRole === "admin") {
      return await PaymentMethodModel.findAllForAdmin();
    }
    return await PaymentMethodModel.findAllActive();
  }

  static async getPaymentMethodById(id, userRole) {
    const method = await PaymentMethodModel.findById(id);
    if (!method) throw new Error("Méthode de paiement non trouvée");
    if (userRole !== "admin" && !method.is_active) {
      throw new Error("Accès non autorisé à cette méthode de paiement");
    }
    return method;
  }

  static async getPaymentMethodsByCountry(countryId, userRole) {
    const country = await CountryModel.findById(countryId);
    if (!country) throw new Error("Pays non trouvé");

    if (userRole === "admin") {
      return await PaymentMethodModel.findByCountryForAdmin(countryId);
    }

    // Utilisateur normal : le pays doit être actif
    if (!country.is_active) {
      throw new Error("Ce pays n'est pas disponible");
    }
    return await PaymentMethodModel.findByCountryForUsers(countryId);
  }

  // UPDATE - avec transaction (vérifications multiples + mise à jour)
  static async updatePaymentMethod(id, updateData, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const existing = await PaymentMethodModel.findById(id, client);
      if (!existing) throw new Error("Méthode de paiement non trouvée");

      // Fusion des données
      const newCountryId = updateData.country_id ?? existing.country_id;
      const newMethod = updateData.method ?? existing.method;
      const newCurrencyId = updateData.currency_id ?? existing.currency_id;
      const newIsActive = updateData.is_active ?? existing.is_active;

      // Vérifications d'intégrité
      if (updateData.country_id && updateData.country_id !== existing.country_id) {
        const country = await CountryModel.findById(updateData.country_id, client);
        if (!country) throw new Error("Pays non valide");
      }
      if (updateData.currency_id && updateData.currency_id !== existing.currency_id) {
        const currency = await CurrencyModel.findById(updateData.currency_id, client);
        if (!currency) throw new Error("Devise non valide");
      }
      // Vérifier unicité (country_id + method) si modifiés
      if ((newCountryId !== existing.country_id || newMethod !== existing.method)) {
        const duplicate = await PaymentMethodModel.existsInCountry(newCountryId, newMethod, client);
        if (duplicate && duplicate.id !== parseInt(id)) {
          throw new Error("Cette méthode de paiement existe déjà pour ce pays");
        }
      }

      const updated = await PaymentMethodModel.update(
        id,
        {
          country_id: newCountryId,
          method: newMethod,
          currency_id: newCurrencyId,
          is_active: newIsActive,
        },
        client
      );
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // SOFT DELETE - avec transaction simple
  static async disablePaymentMethod(id, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");

    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const existing = await PaymentMethodModel.findById(id, client);
      if (!existing) throw new Error("Méthode de paiement non trouvée");
      if (!existing.is_active) throw new Error("Cette méthode de paiement est déjà désactivée");

      const disabled = await PaymentMethodModel.softDelete(id, client);
      await client.query("COMMIT");
      return disabled;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // REACTIVATE - avec transaction
  static async reactivatePaymentMethod(id, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");

    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const existing = await PaymentMethodModel.findById(id, client);
      if (!existing) throw new Error("Méthode de paiement non trouvée");
      if (existing.is_active) throw new Error("Cette méthode de paiement est déjà active");

      // Vérifier que le pays associé est actif
      const country = await CountryModel.findById(existing.country_id, client);
      if (!country || !country.is_active) {
        throw new Error("Impossible de réactiver car le pays associé est inactif");
      }

      const reactivated = await PaymentMethodModel.reactivate(id, client);
      await client.query("COMMIT");
      return reactivated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // HARD DELETE - avec transaction
  static async deletePaymentMethod(id, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");

    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const existing = await PaymentMethodModel.findById(id, client);
      if (!existing) throw new Error("Méthode de paiement non trouvée");

      await PaymentMethodModel.hardDelete(id, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PaymentMethodService;