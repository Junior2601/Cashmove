const db = require("../config/db");
const CountryModel = require("../models/country.model");
const CurrencyModel = require("../models/currency.model");

class CountryService {
  // ✅ CREATE - sans transaction (une seule requête + vérifications simples)
  static async createCountry(data) {
    const existingName = await CountryModel.findByName(data.name);
    if (existingName) throw new Error("Ce nom de pays existe déjà");

    const existingCode = await CountryModel.findByCode(data.code);
    if (existingCode) throw new Error("Ce code de pays existe déjà");

    const currency = await CurrencyModel.findById(data.currency_id);
    if (!currency) throw new Error("Devise non valide");

    return await CountryModel.create(data);
  }

  // READ
  static async getCountries(userRole) {
    if (userRole === "admin") {
      return await CountryModel.findAllForAdmin();
    }
    return await CountryModel.findAllActive();
  }

  static async getActiveCountries() {
    return await CountryModel.findAllActive();
  }

  static async getAllCountriesForAdmin() {
    return await CountryModel.findAllForAdmin();
  }

  static async getCountryById(id, userRole) {
    const country = await CountryModel.findById(id);
    if (!country) throw new Error("Pays non trouvé");
    if (userRole !== "admin" && !country.is_active) {
      throw new Error("Accès non autorisé à ce pays");
    }
    return country;
  }

  // UPDATE — sans transaction explicite ni getClient()
  // Un seul UPDATE atomique via pool.query suffit amplement ici.
  static async updateCountry(id, updateData, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");

    // 1. Récupérer l'existant via pool (pas de getClient)
    const existing = await CountryModel.findById(id);
    if (!existing) throw new Error("Pays non trouvé");

    // 2. Vérifications d'unicité
    if (updateData.name && updateData.name !== existing.name) {
      const nameConflict = await CountryModel.findByName(updateData.name);
      if (nameConflict) throw new Error("Ce nom de pays existe déjà");
    }
    if (updateData.code && updateData.code !== existing.code) {
      const codeConflict = await CountryModel.findByCode(updateData.code);
      if (codeConflict) throw new Error("Ce code de pays existe déjà");
    }
    if (updateData.currency_id && updateData.currency_id !== existing.currency_id) {
      const currency = await CurrencyModel.findById(updateData.currency_id);
      if (!currency) throw new Error("Devise non valide");
    }

    // 3. Merger : ne pas écraser les champs non envoyés avec null/undefined
    const merged = {
      name:         updateData.name         ?? existing.name,
      code:         updateData.code         ?? existing.code,
      phone_prefix: updateData.phone_prefix ?? existing.phone_prefix,
      currency_id:  updateData.currency_id  ?? existing.currency_id,
      is_active:    updateData.is_active    ?? existing.is_active,
    };

    // 4. Un seul UPDATE atomique via pool (pas de BEGIN/COMMIT nécessaire)
    return await CountryModel.update(id, merged);
  }

  // SOFT DELETE (transaction)
  static async disableCountry(id, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");

    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const existing = await CountryModel.findById(id, client);
      if (!existing) throw new Error("Pays non trouvé");
      if (!existing.is_active) throw new Error("Ce pays est déjà désactivé");

      const disabled = await CountryModel.softDelete(id, client);
      await client.query("COMMIT");
      return disabled;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // REACTIVATE (transaction)
  static async reactivateCountry(id, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");

    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const existing = await CountryModel.findById(id, client);
      if (!existing) throw new Error("Pays non trouvé");
      if (existing.is_active) throw new Error("Ce pays est déjà actif");

      const reactivated = await CountryModel.reactivate(id, client);
      await client.query("COMMIT");
      return reactivated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // HARD DELETE (transaction)
  static async deleteCountry(id, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");

    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const existing = await CountryModel.findById(id, client);
      if (!existing) throw new Error("Pays non trouvé");

      await CountryModel.hardDelete(id, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23503") {
        throw new Error("Impossible de supprimer ce pays car il est utilisé par d'autres entités");
      }
      throw error;
    } finally {
      client.release();
    }
  }

  static async getCountryStats(userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    return await CountryModel.getStats();
  }
}

module.exports = CountryService;