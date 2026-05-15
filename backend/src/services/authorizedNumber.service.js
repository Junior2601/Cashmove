const db = require("../config/db");
const AuthorizedNumberModel = require("../models/authorizedNumber.model");
const AgentModel = require("../models/agent.model");
const CountryModel = require("../models/country.model");
const PaymentMethodModel = require("../models/paymentMethod.model");

class AuthorizedNumberService {
  // CREATE - sans transaction (vérifications + insertion unique)
  static async createAuthorizedNumber(data, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");

    const { agent_id, country_id, payment_method_id, number, label, is_active } = data;

    // Vérifications d'existence
    const agent = await AgentModel.findById(agent_id);
    if (!agent) throw new Error("Agent non trouvé");

    const country = await CountryModel.findById(country_id);
    if (!country) throw new Error("Pays non trouvé");

    const paymentMethod = await PaymentMethodModel.findById(payment_method_id);
    if (!paymentMethod) throw new Error("Méthode de paiement non trouvée");

    // Vérifier unicité de la combinaison
    const existing = await AuthorizedNumberModel.existsForCombination(agent_id, country_id, payment_method_id);
    if (existing) {
      throw new Error("Cette combinaison agent/pays/méthode de paiement existe déjà");
    }

    return await AuthorizedNumberModel.create({
      agent_id,
      country_id,
      payment_method_id,
      number,
      label,
      is_active,
    });
  }

  // READ
  static async getAllAuthorizedNumbers(userRole) {
    if (userRole === "admin") {
      return await AuthorizedNumberModel.findAllForAdmin();
    }
    return await AuthorizedNumberModel.findAllActive();
  }

  static async getAuthorizedNumberById(id, userRole) {
    const record = await AuthorizedNumberModel.findById(id);
    if (!record) throw new Error("Numéro autorisé non trouvé");
    if (userRole !== "admin" && !record.is_active) {
      throw new Error("Accès non autorisé à ce numéro autorisé");
    }
    return record;
  }

  static async getAuthorizedNumbersByCountry(countryId, userRole) {
    const country = await CountryModel.findById(countryId);
    if (!country) throw new Error("Pays non trouvé");

    if (userRole === "admin") {
      return await AuthorizedNumberModel.findByCountryForAdmin(countryId);
    }
    if (!country.is_active) throw new Error("Ce pays n'est pas disponible");
    return await AuthorizedNumberModel.findByCountryForUsers(countryId);
  }

  static async getAuthorizedNumbersByAgent(agentId, userRole) {
    const agent = await AgentModel.findById(agentId);
    if (!agent) throw new Error("Agent non trouvé");

    if (userRole === "admin") {
      return await AuthorizedNumberModel.findByAgentForAdmin(agentId);
    }
    if (!agent.is_active) throw new Error("Cet agent n'est pas disponible");
    return await AuthorizedNumberModel.findByAgentForUsers(agentId);
  }

  static async getAuthorizedNumbersByPaymentMethod(paymentMethodId, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    const paymentMethod = await PaymentMethodModel.findById(paymentMethodId);
    if (!paymentMethod) throw new Error("Méthode de paiement non trouvée");
    return await AuthorizedNumberModel.findByPaymentMethodForAdmin(paymentMethodId);
  }

  // UPDATE - avec transaction (vérifications multiples)
  static async updateAuthorizedNumber(id, updateData, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");

    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const existing = await AuthorizedNumberModel.findById(id, client);
      if (!existing) throw new Error("Numéro autorisé non trouvé");

      const newAgentId = updateData.agent_id ?? existing.agent_id;
      const newCountryId = updateData.country_id ?? existing.country_id;
      const newPaymentMethodId = updateData.payment_method_id ?? existing.payment_method_id;
      const newNumber = updateData.number ?? existing.number;
      const newLabel = updateData.label !== undefined ? updateData.label : existing.label;
      const newIsActive = updateData.is_active !== undefined ? updateData.is_active : existing.is_active;

      // Vérifications si les clés étrangères changent
      if (updateData.agent_id && updateData.agent_id !== existing.agent_id) {
        const agent = await AgentModel.findById(updateData.agent_id, client);
        if (!agent) throw new Error("Agent non valide");
      }
      if (updateData.country_id && updateData.country_id !== existing.country_id) {
        const country = await CountryModel.findById(updateData.country_id, client);
        if (!country) throw new Error("Pays non valide");
      }
      if (updateData.payment_method_id && updateData.payment_method_id !== existing.payment_method_id) {
        const pm = await PaymentMethodModel.findById(updateData.payment_method_id, client);
        if (!pm) throw new Error("Méthode de paiement non valide");
      }

      // Vérifier unicité de la nouvelle combinaison (si modifiée)
      if (
        newAgentId !== existing.agent_id ||
        newCountryId !== existing.country_id ||
        newPaymentMethodId !== existing.payment_method_id
      ) {
        const duplicate = await AuthorizedNumberModel.existsForCombination(
          newAgentId,
          newCountryId,
          newPaymentMethodId,
          id,
          client
        );
        if (duplicate) {
          throw new Error("Cette combinaison agent/pays/méthode de paiement existe déjà");
        }
      }

      const updated = await AuthorizedNumberModel.update(
        id,
        {
          agent_id: newAgentId,
          country_id: newCountryId,
          payment_method_id: newPaymentMethodId,
          number: newNumber,
          label: newLabel,
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

  // SOFT DELETE - avec transaction
  static async disableAuthorizedNumber(id, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const existing = await AuthorizedNumberModel.findById(id, client);
      if (!existing) throw new Error("Numéro autorisé non trouvé");
      if (!existing.is_active) throw new Error("Ce numéro autorisé est déjà désactivé");
      const disabled = await AuthorizedNumberModel.softDelete(id, client);
      await client.query("COMMIT");
      return disabled;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // REACTIVATE - avec transaction et vérification que l'agent est actif
  static async reactivateAuthorizedNumber(id, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const existing = await AuthorizedNumberModel.findById(id, client);
      if (!existing) throw new Error("Numéro autorisé non trouvé");
      if (existing.is_active) throw new Error("Ce numéro autorisé est déjà actif");
      const isAgentActive = await AuthorizedNumberModel.getAgentActiveStatus(existing.agent_id, client);
      if (!isAgentActive) throw new Error("Impossible de réactiver car l'agent associé est inactif");
      const reactivated = await AuthorizedNumberModel.reactivate(id, client);
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
  static async deleteAuthorizedNumber(id, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const existing = await AuthorizedNumberModel.findById(id, client);
      if (!existing) throw new Error("Numéro autorisé non trouvé");
      await AuthorizedNumberModel.hardDelete(id, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = AuthorizedNumberService;