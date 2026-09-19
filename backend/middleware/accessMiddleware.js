const jwt = require("jsonwebtoken");
const { getGrantById } = require("../db/queries/access");
const dp = require("../db/queries/doctorPortal");

async function requireAccessGrant(req, res, next) {
  const token = req.headers["x-access-token"];

  if (!token) {
    return res.status(403).json({ success: false, message: "Access authorization required" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ success: false, message: "Invalid or expired access authorization" });
  }

  if (!decoded.grantId || decoded.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: "Invalid or expired access authorization" });
  }

  try {
    const grant = await getGrantById(decoded.grantId);
    if (!grant || grant.status !== "active" || new Date(grant.expiresAt) < new Date()) {
      return res.status(403).json({ success: false, message: "Access authorization expired" });
    }
    req.access = { grant };
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAccessForRole(...roles) {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) {
      return requireAccessGrant(req, res, next);
    }
    return next();
  };
}

async function requirePatientAccess(req, res, next) {
  const patientId = Number(req.params.patientId);
  if (!Number.isInteger(patientId) || patientId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid patient ID" });
  }

  try {
    const grant = await dp.getActiveAccess(req.user.id, patientId);
    if (!grant) {
      return res.status(403).json({
        success: false,
        message: "You do not have active access to this patient's records",
      });
    }
    req.access = { grant };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireAccessGrant, requireAccessForRole, requirePatientAccess };