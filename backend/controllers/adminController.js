const admin = require("../db/queries/admin");
const { getStaffHospitalId } = require("../db/queries/staff");
const { audit } = require("../services/auditService");

const MANAGE_ROLES = ["admin", "super_admin"];

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

async function resolveScope(req) {
  if (req.user.role === "hospital") {
    return getStaffHospitalId(req.user.id);
  }
  return null;
}

async function getDashboard(req, res, next) {
  try {
    const hospitalId = await resolveScope(req);
    const [stats, recentUsers, recentActivity] = await Promise.all([
      admin.getPlatformStats(hospitalId),
      admin.getRecentUsers(hospitalId),
      admin.getRecentActivity(hospitalId),
    ]);
    return res.json({ success: true, data: { scope: hospitalId ? 'hospital' : 'platform', stats, recentUsers, recentActivity } });
  } catch (error) {
    return next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const hospitalId = await resolveScope(req);
    const { role, q } = req.query;
    const data = await admin.listUsers({ role: role || null, q: q || null, hospitalId });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const { userId } = req.params;
    if (!isValidId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }
    const target = await admin.findUserById(Number(userId));
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (target.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot change your own account status" });
    }
    if (target.role === "super_admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "You are not authorized to modify this account" });
    }

    const hospitalId = await resolveScope(req);
    if (hospitalId && target.hospitalId !== hospitalId) {
      return res.status(403).json({ success: false, message: "You are not authorized to modify this account" });
    }

    const isActive = req.body && req.body.isActive !== undefined ? !!req.body.isActive : !target.isActive;
    const data = await admin.setUserActive(target.id, isActive);
    await audit(req, isActive ? "user_activated" : "user_deactivated", "user", target.id, { role: target.role });
    return res.json({ success: true, message: isActive ? "Account activated" : "Account deactivated", data });
  } catch (error) {
    return next(error);
  }
}

async function listHospitals(req, res, next) {
  try {
    const data = await admin.listHospitals();
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function createHospital(req, res, next) {
  try {
    if (!MANAGE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You are not authorized to create hospitals" });
    }
    const { name } = req.body || {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Hospital name is required" });
    }
    const data = await admin.createHospital({ ...req.body, name: name.trim() });
    await audit(req, "hospital_created", "hospital", data.id, { name: data.name });
    return res.status(201).json({ success: true, message: "Hospital created", data });
  } catch (error) {
    return next(error);
  }
}

async function listActivity(req, res, next) {
  try {
    const hospitalId = await resolveScope(req);
    const data = await admin.getRecentActivity(hospitalId, 50);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboard,
  listUsers,
  updateUserStatus,
  listHospitals,
  createHospital,
  listActivity,
};
