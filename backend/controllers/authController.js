const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../db/pool");
const { getDBStatus } = require("../db/status");
const users = require("../db/queries/users");
const patients = require("../db/queries/patients");
const doctors = require("../db/queries/doctors");
const { signToken, blacklistToken } = require("../middleware/authMiddleware");

const ROLES = ["patient", "doctor", "hospital", "admin", "pharmacist", "diagnostic_staff"];

function assertDB() {
  if (getDBStatus() !== "connected") {
    const error = new Error("Database connection unavailable");
    error.expose = true;
    error.status = 503;
    throw error;
  }
}

async function register(req, res, next) {
  try {
    assertDB();

    const { fullName, name, phone, password, role, dateOfBirth, gender } = req.body;
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!fullName && !name) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }
    if (!role || !ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Valid role is required" });
    }

    const existing = await users.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const full = fullName || name;

    const client = await pool.connect();
    let createdUser;
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, date_of_birth, gender)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [full, email, phone || null, passwordHash, role, dateOfBirth || null, gender || null]
      );
      createdUser = rows[0];

      if (role === "patient") {
        const profile = await patients.createPatientProfile(createdUser.id, { client });
        createdUser.profile = profile;
      } else if (role === "doctor") {
        await doctors.createDoctor(createdUser.id, {}, client);
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      if (err.code === "23505" && ["users_email_key", "users_email_lower_key"].includes(err.constraint)) {
        return res.status(409).json({ success: false, message: "An account with this email already exists." });
      }
      throw err;
    } finally {
      client.release();
    }

    const token = signToken(users.toPublicUser(createdUser));
    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: { token, user: users.toPublicUser(createdUser) },
    });
  } catch (error) {
    console.error("Registration failed:", error.message);
    if (error.code === "ECONNREFUSED" || error.code === "57P03" || error.status === 503 || /connection|database/i.test(error.message)) {
      return res.status(503).json({ success: false, message: "Unable to create your account right now. Please try again." });
    }
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    assertDB();

    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const { password, role: requestedRole } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await users.findUserByEmail(email);
    if (!user || user.is_active === false || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: "Invalid login ID or password" });
    }

    const requestedRoleNormalized = requestedRole === "super-admin" ? "super_admin" : requestedRole;
    if (requestedRoleNormalized && requestedRoleNormalized !== user.role) {
      return res.status(401).json({ success: false, message: "Invalid login ID or password" });
    }

    const token = signToken(users.toPublicUser(user));
    return res.json({
      success: true,
      data: { token, user: users.toPublicUser(user) },
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    if (error.code === "ECONNREFUSED" || error.code === "57P03" || error.status === 503 || /connection|database/i.test(error.message)) {
      return res.status(503).json({ success: false, message: "Unable to sign in right now. Please try again." });
    }
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    assertDB();

    const user = await users.findUserById(req.user.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Account not found" });
    }

    const data = users.toPublicUser(user);

    if (user.role === "patient") {
      data.profile = await patients.getPatientByUserId(req.user.id);
    } else if (user.role === "doctor") {
      data.doctor = await doctors.getDoctorByUserId(req.user.id);
    }

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    if (req.authToken) {
      await blacklistToken(req.authToken);
    }
    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    assertDB();

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await users.findUserByEmail(email);
    const devToken = isDev() ? "PLACEHOLDER" : null;

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await pool.query(
        "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        [user.id, tokenHash, expiresAt]
      );
      if (isDev()) return res.json({ success: true, message: "Password reset link created", devToken: token });
    }

    return res.json({ success: true, message: "If an account exists, a reset link has been issued" });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    assertDB();

    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Valid reset token and a password of at least 8 characters are required" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const { rows } = await pool.query(
      `SELECT * FROM password_resets WHERE token_hash = $1 AND used = false AND expires_at > now()`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, rows[0].user_id]);
    await pool.query("UPDATE password_resets SET used = true WHERE id = $1", [rows[0].id]);

    return res.json({ success: true, message: "Password reset successfully. Please log in." });
  } catch (error) {
    return next(error);
  }
}

function isDev() {
  return process.env.NODE_ENV !== "production";
}

module.exports = { register, login, me, logout, forgotPassword, resetPassword };