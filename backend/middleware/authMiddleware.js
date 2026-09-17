const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db/pool");
const { findUserById } = require("../db/queries/users");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function isBlacklisted(token) {
  const hash = hashToken(token);
  const { rows } = await pool.query(
    "SELECT 1 FROM token_blacklist WHERE token_hash = $1 AND expires_at > now()",
    [hash]
  );
  return rows.length > 0;
}

async function blacklistToken(token) {
  try {
    const decoded = jwt.decode(token);
    const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 60 * 1000);
    await pool.query(
      "INSERT INTO token_blacklist (token_hash, expires_at) VALUES ($1, $2) ON CONFLICT (token_hash) DO NOTHING",
      [hashToken(token), expiresAt]
    );
  } catch {
    // ignore invalid tokens during logout
  }
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const token = header.slice(7).trim();
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  try {
    if (await isBlacklisted(token)) {
      return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }

    const user = await findUserById(decoded.sub);
    if (!user || user.is_active === false) {
      return res.status(401).json({ success: false, message: "Account not found" });
    }

    req.user = { id: Number(user.id), role: user.role, fullName: user.full_name, email: user.email };
    req.authToken = token;
    return next();
  } catch (error) {
    return next(error);
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
    }
    return next();
  };
}

module.exports = { protect, authorizeRoles, signToken, blacklistToken, hashToken, isBlacklisted };