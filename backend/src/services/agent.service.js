// ======================= services/agent.service.js =======================
const bcrypt = require("bcrypt");
const db = require("../config/db");
const AgentModel = require("../models/agent.model");
const CountryModel = require("../models/country.model");

/**
 * Service Agent : contient toute la logique métier (validations, transactions, hash, règles métier).
 */
class AgentService {
  // CREATE
  static async createAgent(data, currentUserRole) {
    // Seul admin peut créer
    if (currentUserRole !== "admin") {
      throw new Error("Non autorisé : seuls les administrateurs peuvent créer un agent");
    }

    const { name, email, password, country_id, can_process, is_active } = data;

    if (!name || !email || !password || !country_id) {
      throw new Error("Nom, email, mot de passe et pays sont requis");
    }

    // Vérifier unicité email
    const existing = await AgentModel.emailExists(email);
    if (existing) {
      throw new Error("Cet email est déjà utilisé");
    }

    // Vérifier existence pays
    const country = await CountryModel.findById(country_id);
    if (!country) {
      throw new Error("Pays non trouvé");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Transaction pour créer l'agent (bien qu'une seule requête, on peut utiliser transaction pour l'exemple)
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const agent = await AgentModel.create(
        {
          name,
          email,
          password: hashedPassword,
          country_id,
          can_process: can_process ?? false,
          is_active: is_active ?? true,
        },
        client
      );
      await client.query("COMMIT");
      return agent;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // GET ALL (selon rôle)
  static async getAgents(currentUser) {
    const { role, id: currentAgentId } = currentUser;

    if (role === "admin") {
      return await AgentModel.findAllForAdmin();
    }
    if (role === "semi-admin") {
      return await AgentModel.findAllForSemiAdmin();
    }
    if (role === "agent") {
      return await AgentModel.findAllForAgent(currentAgentId);
    }
    throw new Error("Rôle non autorisé");
  }

  // GET BY ID (avec vérification droits)
  static async getAgentById(agentId, currentUser) {
    const { role, id: currentUserId } = currentUser;
    const agent = await AgentModel.findById(agentId);
    if (!agent) {
      throw new Error("Agent non trouvé");
    }

    if (role === "admin") {
      return agent;
    }
    if (role === "semi-admin") {
      if (!agent.is_active) {
        throw new Error("Cet agent n'est pas accessible");
      }
      return agent;
    }
    if (role === "agent") {
      if (parseInt(agentId) !== currentUserId) {
        throw new Error("Vous ne pouvez voir que votre propre compte");
      }
      return agent;
    }
    throw new Error("Accès non autorisé");
  }

  // GET CURRENT AGENT (profil)
  static async getCurrentAgent(currentUserId) {
    const agent = await AgentModel.findById(currentUserId);
    if (!agent) {
      throw new Error("Agent non trouvé");
    }
    return agent;
  }

  // UPDATE agent (admin seulement)
  static async updateAgent(agentId, data, currentUserRole) {
    if (currentUserRole !== "admin") {
      throw new Error("Non autorisé : seuls les administrateurs peuvent modifier un agent");
    }

    const existingAgent = await AgentModel.findById(agentId);
    if (!existingAgent) {
      throw new Error("Agent non trouvé");
    }

    const { name, email, country_id, can_process, is_active } = data;

    // Vérifier l'email (si changé)
    if (email && email !== existingAgent.email) {
      const emailExists = await AgentModel.emailExists(email, agentId);
      if (emailExists) {
        throw new Error("Cet email est déjà utilisé par un autre agent");
      }
    }

    // Vérifier pays
    if (country_id) {
      const country = await CountryModel.findById(country_id);
      if (!country) {
        throw new Error("Pays non trouvé");
      }
    }

    // Transaction pour mise à jour
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const updated = await AgentModel.update(
        agentId,
        {
          name: name ?? existingAgent.name,
          email: email ?? existingAgent.email,
          country_id: country_id ?? existingAgent.country_id,
          can_process: can_process !== undefined ? can_process : existingAgent.can_process,
          is_active: is_active !== undefined ? is_active : existingAgent.is_active,
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

  // UPDATE PASSWORD
  static async updatePassword(agentId, { current_password, new_password }, currentUser) {
    const { role, id: currentUserId } = currentUser;

    // Vérifier permissions
    if (role !== "admin" && role !== "agent") {
      throw new Error("Accès non autorisé");
    }
    if (role === "agent" && parseInt(agentId) !== currentUserId) {
      throw new Error("Vous ne pouvez changer que votre propre mot de passe");
    }

    const agent = await AgentModel.findById(agentId);
    if (!agent) {
      throw new Error("Agent non trouvé");
    }

    // Pour un agent, vérifier l'ancien mot de passe
    if (role === "agent") {
      if (!current_password) {
        throw new Error("Mot de passe actuel requis");
      }
      const isMatch = await bcrypt.compare(current_password, agent.password);
      if (!isMatch) {
        throw new Error("Mot de passe actuel incorrect");
      }
    }

    if (!new_password || new_password.length < 6) {
      throw new Error("Le nouveau mot de passe doit contenir au moins 6 caractères");
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await AgentModel.updatePassword(agentId, hashedPassword);
    return { message: "Mot de passe mis à jour avec succès" };
  }

  // TOGGLE STATUS (admin seulement)
  static async toggleAgentStatus(agentId, is_active, currentUserRole) {
    if (currentUserRole !== "admin") {
      throw new Error("Non autorisé");
    }
    if (is_active === undefined) {
      throw new Error("Le statut is_active est requis");
    }
    const existingAgent = await AgentModel.findById(agentId);
    if (!existingAgent) {
      throw new Error("Agent non trouvé");
    }
    const updated = await AgentModel.updateStatus(agentId, is_active);
    return updated;
  }

  // TOGGLE CAN PROCESS (admin seulement)
  static async toggleCanProcess(agentId, can_process, currentUserRole) {
    if (currentUserRole !== "admin") {
      throw new Error("Non autorisé");
    }
    if (can_process === undefined) {
      throw new Error("La permission can_process est requise");
    }
    const existingAgent = await AgentModel.findById(agentId);
    if (!existingAgent) {
      throw new Error("Agent non trouvé");
    }
    const updated = await AgentModel.updateCanProcess(agentId, can_process);
    return updated;
  }

  // SOFT DELETE (admin seulement)
  static async deleteAgent(agentId, currentUserRole) {
    if (currentUserRole !== "admin") {
      throw new Error("Non autorisé");
    }
    const existingAgent = await AgentModel.findById(agentId);
    if (!existingAgent) {
      throw new Error("Agent non trouvé");
    }
    await AgentModel.softDelete(agentId);
    return { message: "Agent supprimé avec succès" };
  }

  // HARD DELETE (admin seulement)
  static async hardDeleteAgent(agentId, currentUserRole) {
    if (currentUserRole !== "admin") {
      throw new Error("Non autorisé");
    }
    const existingAgent = await AgentModel.findById(agentId);
    if (!existingAgent) {
      throw new Error("Agent non trouvé");
    }
    try {
      await AgentModel.hardDelete(agentId);
      return { message: "Agent supprimé définitivement" };
    } catch (error) {
      if (error.code === "23503") {
        throw new Error("Impossible de supprimer cet agent car il a des données associées");
      }
      throw error;
    }
  }

  // GET AGENTS BY COUNTRY (admin et semi-admin)
  static async getAgentsByCountry(country_id, currentUserRole) {
    if (currentUserRole !== "admin" && currentUserRole !== "semi-admin") {
      throw new Error("Non autorisé");
    }
    const country = await CountryModel.findById(country_id);
    if (!country) {
      throw new Error("Pays non trouvé");
    }
    const agents = await AgentModel.findByCountry(country_id);
    return { country, agents };
  }

  // COUNT AGENTS BY COUNTRY (admin et semi-admin)
  static async countAgentsByCountry(country_id, currentUserRole) {
    if (currentUserRole !== "admin" && currentUserRole !== "semi-admin") {
      throw new Error("Non autorisé");
    }
    const country = await CountryModel.findById(country_id);
    if (!country) {
      throw new Error("Pays non trouvé");
    }
    const count = await AgentModel.countByCountry(country_id);
    return {
      country_id: parseInt(country_id),
      country_name: country.name,
      active_agents_count: count,
    };
  }
}

module.exports = AgentService;