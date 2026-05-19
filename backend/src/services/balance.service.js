const db = require("../config/db");
const BalanceModel = require("../models/balance.model");
const AgentModel = require("../models/agent.model");
const CurrencyModel = require("../models/currency.model");

class BalanceService {
  // CREATE - sans transaction (vérifications + insertion unique)
  static async createBalance(data, userRole, userId) {
    // Seul admin peut créer une balance explicitement
    if (userRole !== "admin") throw new Error("Accès refusé");

    const { agent_id, currency_id, amount } = data;

    const agent = await AgentModel.findById(agent_id);
    if (!agent) throw new Error("Agent non trouvé");

    const currency = await CurrencyModel.findById(currency_id);
    if (!currency) throw new Error("Devise non trouvée");

    const existing = await BalanceModel.hasBalance(agent_id, currency_id);
    if (existing) throw new Error("Une balance existe déjà pour cet agent avec cette devise");

    return await BalanceModel.create({ agent_id, currency_id, amount: amount ?? 0 });
  }

  // READ - selon rôle
  static async getAllBalances(userRole, userId) {
    if (userRole === "admin") {
      return await BalanceModel.findAllForAdmin();
    }
    if (userRole === "semi-admin") {
      return await BalanceModel.findAllForSemiAdmin();
    }
    if (userRole === "agent") {
      return await BalanceModel.findByAgent(userId);
    }
    throw new Error("Rôle non autorisé");
  }

  static async getBalanceById(id, userRole, userId) {
    const balance = await BalanceModel.findById(id);
    if (!balance) throw new Error("Balance non trouvée");

    if (userRole === "admin" || userRole === "semi-admin") {
      return balance;
    }
    if (userRole === "agent") {
      if (balance.agent_id !== userId) {
        throw new Error("Vous ne pouvez voir que vos propres balances");
      }
      return balance;
    }
    throw new Error("Accès non autorisé");
  }

  static async getBalancesByAgent(agentId, userRole, userId) {
    const agent = await AgentModel.findById(agentId);
    if (!agent) throw new Error("Agent non trouvé");

    if (userRole === "admin" || userRole === "semi-admin") {
      return await BalanceModel.findByAgent(agentId);
    }
    if (userRole === "agent") {
      if (parseInt(agentId) !== userId) {
        throw new Error("Vous ne pouvez voir que vos propres balances");
      }
      return await BalanceModel.findByAgent(agentId);
    }
    throw new Error("Accès non autorisé");
  }

  static async getTotalBalanceByAgent(agentId, userRole, userId) {
    const agent = await AgentModel.findById(agentId);
    if (!agent) throw new Error("Agent non trouvé");

    if (userRole === "admin" || userRole === "semi-admin") {
      const total = await BalanceModel.getTotalBalanceByAgent(agentId);
      return { agent_id: parseInt(agentId), agent_name: agent.name, total_balance: total };
    }
    if (userRole === "agent") {
      if (parseInt(agentId) !== userId) {
        throw new Error("Vous ne pouvez voir que vos propres balances");
      }
      const total = await BalanceModel.getTotalBalanceByAgent(agentId);
      return { agent_id: parseInt(agentId), agent_name: agent.name, total_balance: total };
    }
    throw new Error("Accès non autorisé");
  }

  static async getBalancesByCurrency(currencyId, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    const currency = await CurrencyModel.findById(currencyId);
    if (!currency) throw new Error("Devise non trouvée");
    return await BalanceModel.getBalancesByCurrency(currencyId);
  }

  // UPDATE (direct amount) - avec transaction
  static async updateBalanceAmount(id, amount, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    if (amount < 0) throw new Error("Le montant ne peut pas être négatif");

    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const balance = await BalanceModel.findById(id, client);
      if (!balance) throw new Error("Balance non trouvée");
      const updated = await BalanceModel.updateAmount(id, amount, client);
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // CREDIT - avec transaction et historique optionnel
  static async creditBalance(id, amount, description, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    if (!amount || amount <= 0) throw new Error("Montant valide requis pour le crédit");

    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const balance = await BalanceModel.findById(id, client);
      if (!balance) throw new Error("Balance non trouvée");

      const updated = await BalanceModel.atomicAddAmount(id, amount, client);

      if (description) {
        // Vous devez avoir une table balance_transactions (optionnel)
        await client.query(
          `INSERT INTO balance_transactions (balance_id, amount, type, description, created_at)
           VALUES ($1, $2, 'credit', $3, CURRENT_TIMESTAMP)`,
          [id, amount, description]
        );
      }
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // DEBIT - avec transaction et vérification de solde
  static async debitBalance(id, amount, description, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    if (!amount || amount <= 0) throw new Error("Montant valide requis pour le débit");

    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const currentAmount = await BalanceModel.getAmountForUpdate(id, client);
      if (currentAmount < amount) {
        throw new Error(`Solde insuffisant. Solde actuel: ${currentAmount}, débit demandé: ${amount}`);
      }
      const updated = await BalanceModel.atomicAddAmount(id, -amount, client);

      if (description) {
        await client.query(
          `INSERT INTO balance_transactions (balance_id, amount, type, description, created_at)
           VALUES ($1, $2, 'debit', $3, CURRENT_TIMESTAMP)`,
          [id, amount, description]
        );
      }
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
  static async softDeleteBalance(id, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const balance = await BalanceModel.findById(id, client);
      if (!balance) throw new Error("Balance non trouvée");
      const deleted = await BalanceModel.softDelete(id, client);
      await client.query("COMMIT");
      return deleted;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // HARD DELETE - avec transaction
  static async hardDeleteBalance(id, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const balance = await BalanceModel.findById(id, client);
      if (!balance) throw new Error("Balance non trouvée");
      await BalanceModel.hardDelete(id, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = BalanceService;