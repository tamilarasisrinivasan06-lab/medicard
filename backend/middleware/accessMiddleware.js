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

module.exports = { requireAccessGrant, requireAccessForRole };