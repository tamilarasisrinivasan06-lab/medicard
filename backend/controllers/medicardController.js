const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {
  generateOtp,
  hashOtp,
  otpExpiry,
  accessGrantExpiry,
  isDevelopment,
  MAX_OTP_ATTEMPTS,
  ACCESS_GRANT_PURPOSE,
} = require("../services/medicardService");
const patients = require("../db/queries/patients");
const access = require("../db/queries/access");

const MEDICARD_ID_REGEX = /^MC-[A-Z0-9]{8}$/;

function verificationResponse(verification, otp, patient) {
  if (isDevelopment()) {
    console.log(`[dev] OTP for ${verification.medicardId}: ${otp}`);
  }
  return {
    success: true,
    verificationRequired: true,
    verificationId: verification.id,
    medicardId: verification.medicardId,
    patientName: patient.name || null,
    message: "Verification required",
    ...(isDevelopment() ? { devOtp: otp } : {}),
  };
}

async function createVerificationForPatient(patient, requester) {
  const otp = generateOtp();
  const verification = await access.createVerificationRequest({
    requesterId: requester.id,
    patientId: patient.patient_id,
    medicardId: patient.medicard_id,
    role: requester.role,
    otp,
  });
  return { verification, otp };
}

async function getMyMediCard(req, res, next) {
  try {
    const patient = await patients.getPatientByUserId(req.user.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: "MediCard not found" });
    }

    const qrCodeData = await patients.getQrDataByUserId(req.user.id);
    const { generateQrDataURL } = require("../services/medicardService");

    return res.json({
      success: true,
      data: {
        medicardId: patient.medicardId,
        name: patient.name,
        qrDataUrl: qrCodeData ? await generateQrDataURL(qrCodeData) : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getMediCardById(req, res, next) {
  try {
    const { medicardId } = req.params;
    if (!MEDICARD_ID_REGEX.test(medicardId)) {
      return res.status(400).json({ success: false, message: "Invalid MediCard ID" });
    }

    const patient = await patients.getMediCardByMediCardId(medicardId);
    if (!patient) {
      return res.status(404).json({ success: false, message: "MediCard not found" });
    }

    return res.json({
      success: true,
      data: {
        medicardId: patient.medicard_id,
        patientName: patient.name || null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function scanMediCard(req, res, next) {
  try {
    const { qrPayload } = req.body;
    if (typeof qrPayload !== "string" || qrPayload.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid MediCard QR code" });
    }

    const patient = await patients.getMediCardByQr(qrPayload);
    if (!patient) {
      return res.status(404).json({ success: false, message: "MediCard not found" });
    }

    const { verification, otp } = await createVerificationForPatient(patient, req.user);
    return res.json(verificationResponse(verification, otp, patient));
  } catch (error) {
    return next(error);
  }
}

async function requestMediCardAccess(req, res, next) {
  try {
    const { medicardId } = req.body;
    if (typeof medicardId !== "string" || !MEDICARD_ID_REGEX.test(medicardId)) {
      return res.status(400).json({ success: false, message: "Invalid MediCard ID" });
    }

    const patient = await patients.getMediCardByMediCardId(medicardId);
    if (!patient) {
      return res.status(404).json({ success: false, message: "MediCard not found" });
    }

    const { verification, otp } = await createVerificationForPatient(patient, req.user);
    return res.json(verificationResponse(verification, otp, patient));
  } catch (error) {
    return next(error);
  }
}

async function verifyMediCard(req, res, next) {
  try {
    const { verificationId, otp } = req.body;
    if (!verificationId || typeof otp !== "string") {
      return res.status(400).json({ success: false, message: "Verification ID and OTP are required" });
    }

    const verification = await access.getVerificationById(verificationId);
    if (!verification) {
      return res.status(400).json({ success: false, message: "Verification request not found" });
    }

    if (verification.requesterId !== req.user.id) {
      return res.status(403).json({ success: false, message: "You are not authorized to complete this verification" });
    }

    if (verification.status === "verified") {
      return res.status(400).json({ success: false, message: "Verification already completed" });
    }

    if (verification.status === "failed") {
      return res.status(400).json({ success: false, message: "Too many failed attempts. Request a new verification." });
    }

    if (new Date(verification.otpExpiresAt) < new Date()) {
      await access.expireVerification(verification.id);
      return res.status(400).json({ success: false, message: "OTP has expired. Request a new one." });
    }

    const attempts = verification.attempts + 1;

    if (verification.otpHash !== hashOtp(otp)) {
      if (attempts >= MAX_OTP_ATTEMPTS) {
        await access.markVerificationStatus(verification.id, "failed", attempts);
        return res.status(400).json({ success: false, message: "Too many failed attempts. Request a new verification." });
      }
      await access.markVerificationStatus(verification.id, "pending", attempts);
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
        remainingAttempts: MAX_OTP_ATTEMPTS - attempts,
      });
    }

    await access.markVerificationStatus(verification.id, "verified", attempts);

    const patient = await patients.getPatientById(verification.patientId);

    const grant = await access.createAccessGrant({
      requesterId: req.user.id,
      patientId: verification.patientId,
      medicardId: verification.medicardId,
      role: verification.role,
      purpose: ACCESS_GRANT_PURPOSE,
      expiresAt: accessGrantExpiry(),
    });

    const accessToken = jwt.sign(
      {
        grantId: grant.id,
        userId: req.user.id,
        patientId: grant.patientId,
        medicardId: grant.medicardId,
        role: grant.role,
        purpose: ACCESS_GRANT_PURPOSE,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({
      success: true,
      verificationRequired: false,
      message: "MediCard access verified",
      data: {
        grantId: grant.id,
        patientId: grant.patientId,
        medicardId: grant.medicardId,
        patientName: patient ? patient.name : null,
        accessToken,
        expiresAt: grant.expiresAt,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getMyMediCard, getMediCardById, scanMediCard, requestMediCardAccess, verifyMediCard };