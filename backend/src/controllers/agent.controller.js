// ======================= controllers/agent.controller.js =======================
const AgentService = require("../services/agent.service");

/**
 * Contrôleur HTTP : transforme les requêtes, appelle le service, formate la réponse.
 */
const createAgent = async (req, res) => {
  try {
    const agent = await AgentService.createAgent(req.body, req.user.role);
    res.status(201).json({
      success: true,
      data: agent,
      message: "Agent créé avec succès",
    });
  } catch (error) {
    const status = error.message.includes("Non autorisé") ? 403 : (error.message.includes("requis") || error.message.includes("déjà utilisé") || error.message.includes("non trouvé")) ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

const getAgents = async (req, res) => {
  try {
    const agents = await AgentService.getAgents(req.user);
    res.json({ success: true, data: agents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAgentById = async (req, res) => {
  try {
    const agent = await AgentService.getAgentById(req.params.id, req.user);
    res.json({ success: true, data: agent });
  } catch (error) {
    const status = error.message === "Agent non trouvé" ? 404 : (error.message.includes("non autorisé") || error.message.includes("pas accessible") || error.message.includes("peut voir")) ? 403 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

const getCurrentAgent = async (req, res) => {
  try {
    const agent = await AgentService.getCurrentAgent(req.user.id);
    res.json({ success: true, data: agent });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const updateAgent = async (req, res) => {
  try {
    const updated = await AgentService.updateAgent(req.params.id, req.body, req.user.role);
    res.json({ success: true, data: updated, message: "Agent mis à jour avec succès" });
  } catch (error) {
    const status = error.message.includes("Non autorisé") ? 403 : (error.message.includes("non trouvé") ? 404 : (error.message.includes("déjà utilisé") ? 400 : 500));
    res.status(status).json({ success: false, message: error.message });
  }
};

const updatePassword = async (req, res) => {
  try {
    const result = await AgentService.updatePassword(req.params.id, req.body, req.user);
    res.json({ success: true, ...result });
  } catch (error) {
    const status = error.message.includes("Non autorisé") || error.message.includes("peut changer") ? 403 : (error.message.includes("requis") || error.message.includes("incorrect") || error.message.includes("6 caractères")) ? 400 : 404;
    res.status(status).json({ success: false, message: error.message });
  }
};

const toggleAgentStatus = async (req, res) => {
  try {
    const updated = await AgentService.toggleAgentStatus(req.params.id, req.body.is_active, req.user.role);
    res.json({
      success: true,
      data: updated,
      message: `Agent ${updated.is_active ? "activé" : "désactivé"} avec succès`,
    });
  } catch (error) {
    const status = error.message.includes("Non autorisé") ? 403 : (error.message.includes("requis") ? 400 : 404);
    res.status(status).json({ success: false, message: error.message });
  }
};

const toggleCanProcess = async (req, res) => {
  try {
    const updated = await AgentService.toggleCanProcess(req.params.id, req.body.can_process, req.user.role);
    res.json({
      success: true,
      data: updated,
      message: `Permission de traiter les transactions ${updated.can_process ? "accordée" : "retirée"} avec succès`,
    });
  } catch (error) {
    const status = error.message.includes("Non autorisé") ? 403 : (error.message.includes("requis") ? 400 : 404);
    res.status(status).json({ success: false, message: error.message });
  }
};

const deleteAgent = async (req, res) => {
  try {
    const result = await AgentService.deleteAgent(req.params.id, req.user.role);
    res.json({ success: true, ...result });
  } catch (error) {
    const status = error.message.includes("Non autorisé") ? 403 : 404;
    res.status(status).json({ success: false, message: error.message });
  }
};

const hardDeleteAgent = async (req, res) => {
  try {
    const result = await AgentService.hardDeleteAgent(req.params.id, req.user.role);
    res.json({ success: true, ...result });
  } catch (error) {
    const status = error.message.includes("Non autorisé") ? 403 : (error.message.includes("Impossible") ? 400 : 404);
    res.status(status).json({ success: false, message: error.message });
  }
};

const getAgentsByCountry = async (req, res) => {
  try {
    const { country, agents } = await AgentService.getAgentsByCountry(req.params.country_id, req.user.role);
    res.json({
      success: true,
      data: agents,
      message: `Agents pour ${country.name}`,
    });
  } catch (error) {
    const status = error.message.includes("Non autorisé") ? 403 : 404;
    res.status(status).json({ success: false, message: error.message });
  }
};

const countAgentsByCountry = async (req, res) => {
  try {
    const data = await AgentService.countAgentsByCountry(req.params.country_id, req.user.role);
    res.json({ success: true, data });
  } catch (error) {
    const status = error.message.includes("Non autorisé") ? 403 : 404;
    res.status(status).json({ success: false, message: error.message });
  }
};

const getGlobalAgentStats = async (req, res) => {
  try {
    const stats = await AgentService.getGlobalAgentStats(req.user);
    res.json({
      success: true,
      data: stats,
      message: 'Statistiques récupérées avec succès'
    });
  } catch (error) {
    const status = error.message.includes('Non autorisé') ? 403 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

module.exports = {
  createAgent,
  getAgents,
  getAgentById,
  getCurrentAgent,
  updateAgent,
  updatePassword,
  toggleAgentStatus,
  toggleCanProcess,
  deleteAgent,
  hardDeleteAgent,
  getAgentsByCountry,
  countAgentsByCountry,
  getGlobalAgentStats,
};