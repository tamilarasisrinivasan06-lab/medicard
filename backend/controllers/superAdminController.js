const admin = require("../db/queries/admin");
const users = require("../db/queries/users");
const { audit } = require("../services/auditService");

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function emptyOrNull(value) {
  return value === undefined ? undefined : value === "" ? null : value;
}

async function getDashboard(req, res, next) {
  try {
    const [stats, recentUsers, recentActivity] = await Promise.all([
      admin.getPlatformStats(null),
      admin.getRecentUsers(null, 8),
      admin.getRecentActivity(null, 8),
    ]);
    return res.json({
      success: true,
      data: { scope: "platform", stats, recentUsers, recentActivity },
    });
  } catch (error) {
    return next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const { role, q } = req.query;
    const data = await admin.listUsers({ role: role || null, q: q || null, hospitalId: null });
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

    const isActive = req.body && req.body.isActive !== undefined ? !!req.body.isActive : !target.isActive;
    const data = await admin.setUserActive(target.id, isActive);
    await audit(req, isActive ? "user_activated" : "user_deactivated", "user", target.id, { role: target.role });
    return res.json({ success: true, message: isActive ? "Account activated" : "Account deactivated", data });
  } catch (error) {
    return next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await users.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    const data = users.toPublicUser(user);
    data.isActive = user.is_active !== false;
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { fullName, phone, gender, dateOfBirth } = req.body || {};
    if (fullName !== undefined && (typeof fullName !== "string" || !fullName.trim())) {
      return res.status(400).json({ success: false, message: "Full name cannot be empty" });
    }

    const data = await users.updateUser(req.user.id, {
      fullName: fullName !== undefined ? fullName.trim() : undefined,
      phone: emptyOrNull(phone),
      gender: emptyOrNull(gender),
      dateOfBirth: emptyOrNull(dateOfBirth),
    });
    await audit(req, "profile_updated", "user", req.user.id, {});

    const publicData = users.toPublicUser(data);
    publicData.isActive = data.is_active !== false;
    return res.json({ success: true, message: "Profile updated", data: publicData });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getDashboard, listUsers, updateUserStatus, getProfile, updateProfile };