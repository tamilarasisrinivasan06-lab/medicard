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

// Doctor → patient access must be patient-approved and un-expired.
// Sets req.patientAccess and a grant-shaped req.access so shared controllers
// (e.g. createPrescription) that read req.access.grant.patientId keep working.
async function requirePatientAccess(req, res, next) {
  const patientId = Number(req.params.patientId);
  if (!Number.isInteger(patientId) || patientId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid patient ID" });
  }

  try {
    await dp.expireStaleAccess();
    const access = await dp.getActiveAccess(req.user.id, patientId);
    if (!access) {
      return res.status(403).json({ success: false, message: "Active patient authorization is required to access this patient's data" });
    }
    req.patientAccess = access;
    req.access = { grant: { patientId } };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireAccessGrant, requireAccessForRole, requirePatientAccess };