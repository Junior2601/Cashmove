const History = require("../models/history.model");

const logAction = async ({
  action_type,
  actor_type,
  actor_id,
  entity_type,
  entity_id,
  description,
  metadata,
}) => {
  try {
    await History.create({
      action_type,
      actor_type,
      actor_id,
      entity_type,
      entity_id,
      description,
      metadata,
    });
  } catch (error) {
    console.error("History log error:", error);
  }
};

module.exports = { logAction };