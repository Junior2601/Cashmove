const db = require("../config/db");
const CurrencyModel = require("../models/currency.model");

class CurrencyService {
  // Création avec vérification d'unicité explicite (transaction non nécessaire pour une seule requête, mais exemple)
  static async createCurrency(data) {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      // Vérification métier : code unique
      const existing = await CurrencyModel.findByCode(data.code, client);
      if (existing) {
        throw new Error("Ce code de devise existe déjà");
      }

      const currency = await CurrencyModel.create(data, client);
      await client.query("COMMIT");
      return currency;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Récupération selon rôle (pas de transaction nécessaire)
  static async getCurrencies(userRole) {
    if (userRole === "admin") {
      return await CurrencyModel.findAllForAdmin();
    }
    return await CurrencyModel.findAllActive();
  }

  static async getCurrencyById(id, userRole) {
    const currency = await CurrencyModel.findById(id);
    if (!currency) {
      throw new Error("Devise non trouvée");
    }
    if (userRole !== "admin" && !currency.is_active) {
      throw new Error("Accès non autorisé à cette devise");
    }
    return currency;
  }

  // Mise à jour avec transaction pour garantir cohérence
  static async updateCurrency(id, updateData, userRole) {
    if (userRole !== "admin") {
      throw new Error("Accès refusé");
    }

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const existing = await CurrencyModel.findById(id, client);
      if (!existing) {
        throw new Error("Devise non trouvée");
      }

      // Si le code est modifié, vérifier qu'il n'est pas déjà pris
      if (updateData.code && updateData.code !== existing.code) {
        const conflict = await CurrencyModel.findByCode(updateData.code, client);
        if (conflict && conflict.id !== parseInt(id)) {
          throw new Error("Ce code de devise existe déjà");
        }
      }

      const updated = await CurrencyModel.update(id, updateData, client);
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async disableCurrency(id, userRole) {
    if (userRole !== "admin") {
      throw new Error("Accès refusé");
    }

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const existing = await CurrencyModel.findById(id, client);
      if (!existing) {
        throw new Error("Devise non trouvée");
      }
      if (!existing.is_active) {
        throw new Error("Cette devise est déjà désactivée");
      }

      const disabled = await CurrencyModel.softDelete(id, client);
      await client.query("COMMIT");
      return disabled;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async reactivateCurrency(id, userRole) {
    if (userRole !== "admin") {
      throw new Error("Accès refusé");
    }

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const existing = await CurrencyModel.findById(id, client);
      if (!existing) {
        throw new Error("Devise non trouvée");
      }
      if (existing.is_active) {
        throw new Error("Cette devise est déjà active");
      }

      const reactivated = await CurrencyModel.reactivate(id, client);
      await client.query("COMMIT");
      return reactivated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteCurrency(id, userRole) {
    if (userRole !== "admin") {
      throw new Error("Accès refusé");
    }

    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const existing = await CurrencyModel.findById(id, client);
      if (!existing) {
        throw new Error("Devise non trouvée");
      }

      await CurrencyModel.hardDelete(id, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async getStatistics(userRole) {
    // Si l'utilisateur n'est pas admin, on peut ne lui montrer que les stats sur les actives,
    // ou lui refuser l'accès. Ici on choisit : seul l'admin peut voir les inactives.
    // On retourne toujours les trois valeurs, mais pour un non-admin on masque les inactives (0 ou null).
    const stats = await CurrencyModel.getStatistics();

    if (userRole !== "admin") {
      // Pour un simple utilisateur, on ne révèle pas le nombre d'inactives
      return {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        inactive: null, // ou 0, mais mieux de ne pas exposer
      };
    }

    return {
      total: parseInt(stats.total),
      active: parseInt(stats.active),
      inactive: parseInt(stats.inactive),
    };
  }
}

module.exports = CurrencyService;