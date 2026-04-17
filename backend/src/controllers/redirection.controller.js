const service = require("../services/redirection.service");

// CREATE
const createRedirection = async (req, res) => {
  try {
    const result = await service.createRedirectionService(
      req.body,
      { id: req.user.id, type: req.user.role }
    );

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ACCEPT
const acceptRedirection = async (req, res) => {
  try {
    const result = await service.acceptRedirectionService(
      req.params.id,
      { id: req.user.id, type: req.user.role }
    );

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// REJECT
const rejectRedirection = async (req, res) => {
  try {
    const result = await service.rejectRedirectionService(
      req.params.id,
      { id: req.user.id, type: req.user.role }
    );

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  createRedirection,
  acceptRedirection,
  rejectRedirection,
};