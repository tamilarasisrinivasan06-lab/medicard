const crypto = require("crypto");
const QRCode = require("qrcode");

const ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const OTP_TTL_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const ACCESS_GRANT_TTL_MINUTES = 15;
const ACCESS_GRANT_PURPOSE = "temporary_access";

function generateMediCardId() {
  let id = "";
  for (let i = 0; i < 8; i += 1) {
    const index = crypto.randomInt(0, ID_CHARS.length);
    id += ID_CHARS[index];
  }
  return `MC-${id}`;
}

function generateQRCodeData() {
  return crypto.randomBytes(32).toString("hex");
}

async function generateQrDataURL(payload) {
  return QRCode.toDataURL(payload);
}

function generateOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function otpExpiry() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + OTP_TTL_MINUTES);
  return date;
}

function accessGrantExpiry() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + ACCESS_GRANT_TTL_MINUTES);
  return date;
}

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

module.exports = {
  generateMediCardId,
  generateQRCodeData,
  generateQrDataURL,
  generateOtp,
  hashOtp,
  otpExpiry,
  accessGrantExpiry,
  isDevelopment,
  OTP_TTL_MINUTES,
  MAX_OTP_ATTEMPTS,
  ACCESS_GRANT_TTL_MINUTES,
  ACCESS_GRANT_PURPOSE,
};