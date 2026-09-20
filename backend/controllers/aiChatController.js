const aiService = require("../services/aiService");
const { audit } = require("../services/auditService");

async function askPatientAssistant(req, res, next) {
  try {
    const patientId = Number(req.params.patientId);
    const { query, history } = req.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Query text is required" });
    }

    // 1. Assemble structured clinical context from the PostgreSQL database
    const context = await aiService.assembleClinicalContext(patientId, query);
    if (!context) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    // 2. Synthesize or run LLM answering engine
    const doctorName = req.user.fullName || "Doctor";
    const result = await aiService.answerClinicalQuery({
      patientContext: context,
      query: query.trim(),
      chatHistory: Array.isArray(history) ? history : [],
      doctorName,
    });

    // 3. Clinical audit trail logging
    try {
      await audit(req, "ai_clinical_query", "patient", patientId, {
        queryLength: query.length,
        consultationCount: context.stats.totalConsultationsRecorded,
      });
    } catch {
      // Audit non-fatal
    }

    return res.json({
      success: true,
      data: {
        patientId,
        patientName: context.patient.name,
        medicardId: context.patient.medicardId,
        query: query.trim(),
        answer: result.answer,
        suggestedQuestions: result.suggestedQuestions || [],
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getPatientClinicalSummary(req, res, next) {
  try {
    const patientId = Number(req.params.patientId);
    const context = await aiService.assembleClinicalContext(patientId, "summary");
    if (!context) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const doctorName = req.user.fullName || "Doctor";
    const result = await aiService.answerClinicalQuery({
      patientContext: context,
      query: "Give me an executive clinical summary and timeline",
      doctorName,
    });

    return res.json({
      success: true,
      data: {
        patient: context.patient,
        summary: result.answer,
        allergies: context.allergies,
        activeMedications: context.activeMedications,
        stats: context.stats,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  askPatientAssistant,
  getPatientClinicalSummary,
};
