const auditQ = require("../db/queries/audit");

async function audit(req, action, targetType, targetId, details) {
  try {
    await auditQ.createLog({
      userId: req.user.id,
      role: req.user.role,
      action,
      targetType,
      targetId,
      details,
      ip: req.ip || (req.socket && req.socket.remoteAddress) || null,
    });
  } catch {
    // Logging must never break the main request.
  }
}

module.exports = { audit };