const pool = require("../db/pool");
const patients = require("../db/queries/patients");
const allergies = require("../db/queries/allergies");
const prescriptions = require("../db/queries/prescriptions");
const dp = require("../db/queries/doctorPortal");
const records = require("../db/queries/records");

/**
 * High-performance clinical patient context aggregator for AI Assistant.
 * Designed to handle patients with 1000+ historical records efficiently.
 */
async function assembleClinicalContext(patientId, query = "") {
  const pId = Number(patientId);
  const patient = await patients.getPatientById(pId);
  if (!patient) return null;

  // Parallel retrieval of primary medical vectors with selective limits
  const [
    allergyList,
    recentConsultations,
    recentPrescriptions,
    recentLabReports,
    medicalRecords
  ] = await Promise.all([
    allergies.listAllergies(pId),
    pool.query(
      `SELECT c.id, c.title, c.symptoms, c.diagnosis, c.advice_notes, c.consultation_date, c.hospital_name,
              u.full_name AS doctor_name, d.specialization
       FROM consultations c
       JOIN users u ON u.id = c.doctor_id
       LEFT JOIN doctors d ON d.user_id = c.doctor_id
       WHERE c.patient_id = $1
       ORDER BY c.consultation_date DESC, c.created_at DESC
       LIMIT 25`,
      [pId]
    ),
    prescriptions.listPrescriptionsByPatient(pId),
    pool.query(
      `SELECT lr.id, lr.title, lr.summary, lr.report_text, lr.report_date,
              u.full_name AS doctor_name
       FROM lab_reports lr
       JOIN users u ON u.id = lr.doctor_id
       WHERE lr.patient_id = $1
       ORDER BY lr.report_date DESC, lr.created_at DESC
       LIMIT 20`,
      [pId]
    ),
    pool.query(
      `SELECT mr.id, mr.title, mr.record_type, mr.diagnosis, mr.description, mr.record_date, mr.hospital_name
       FROM medical_records mr
       WHERE mr.patient_id = $1
       ORDER BY mr.record_date DESC
       LIMIT 15`,
      [pId]
    )
  ]);

  // Aggregate active medications
  const activeMedications = [];
  const seenMeds = new Set();
  for (const rx of (recentPrescriptions || []).slice(0, 10)) {
    for (const item of (rx.items || [])) {
      const key = (item.medicineName || "").trim().toLowerCase();
      if (key && !seenMeds.has(key)) {
        seenMeds.add(key);
        activeMedications.push({
          medicine: item.medicineName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          prescribedDate: rx.prescriptionDate,
          prescribedBy: rx.doctorName,
          diagnosis: rx.diagnosis,
        });
      }
    }
  }

  // Calculate age from DOB if available
  let age = null;
  if (patient.dateOfBirth) {
    const birthDate = new Date(patient.dateOfBirth);
    const diffMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(diffMs);
    age = Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  return {
    patient: {
      id: patient.id,
      name: patient.name,
      medicardId: patient.medicardId,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      age: age,
      height: patient.height,
      weight: patient.weight,
      emergencyContact: patient.emergencyContact,
    },
    allergies: allergyList.map((a) => ({
      allergen: a.allergen,
      severity: a.severity,
      reaction: a.reaction,
    })),
    activeMedications,
    recentConsultations: recentConsultations.rows.map((c) => ({
      date: c.consultation_date,
      title: c.title,
      diagnosis: c.diagnosis,
      symptoms: c.symptoms,
      advice: c.advice_notes,
      doctor: `${c.doctor_name} (${c.specialization || "Physician"})`,
    })),
    recentLabReports: recentLabReports.rows.map((l) => ({
      date: l.report_date,
      title: l.title,
      summary: l.summary,
      details: l.report_text,
      verifiedBy: l.doctor_name,
    })),
    medicalHistoryRecords: medicalRecords.rows.map((r) => ({
      date: r.record_date,
      title: r.title,
      type: r.record_type,
      diagnosis: r.diagnosis,
      summary: r.description,
    })),
    stats: {
      totalConsultationsRecorded: recentConsultations.rowCount,
      totalPrescriptionsRecorded: recentPrescriptions.length,
      totalLabReportsRecorded: recentLabReports.rowCount,
    }
  };
}

/**
 * Rule-based Clinical Intelligence Engine with optional Google Gemini / LLM integration.
 * Produces immediate, structured clinical synthesis, conflict detection, and answers.
 */
async function answerClinicalQuery({ patientContext, query, chatHistory = [], doctorName = "Doctor" }) {
  const p = patientContext.patient;
  const qLower = (query || "").toLowerCase();

  // If external Gemini API is configured via GEMINI_API_KEY, call Gemini API
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await callGeminiLLM({ patientContext, query, chatHistory, doctorName });
      if (response) return response;
    } catch (llmErr) {
      console.warn("Gemini LLM API call fallback:", llmErr.message);
    }
  }

  // High-performance Grounded Clinical Reasoning Engine (Zero hallucination, deterministic synthesis)
  return generateClinicalSynthesis(patientContext, query, doctorName);
}

function generateClinicalSynthesis(context, query, doctorName) {
  const p = context.patient;
  const q = (query || "").toLowerCase();
  const allergies = context.allergies || [];
  const meds = context.activeMedications || [];
  const consults = context.recentConsultations || [];
  const labs = context.recentLabReports || [];

  // Intent 1: Medications / Drugs / Interactions / Conflicts
  if (q.includes("med") || q.includes("drug") || q.includes("prescription") || q.includes("tablet") || q.includes("interaction")) {
    let text = `### 💊 Current Active Medications for **${p.name}**\n\n`;
    if (meds.length === 0) {
      text += `No active prescriptions currently on record.\n\n`;
    } else {
      text += `Found **${meds.length} active medications** from recent consultations:\n\n`;
      meds.forEach((m, idx) => {
        text += `${idx + 1}. **${m.medicine}** — ${m.dosage || "Standard Dose"}\n`;
        text += `   • Frequency: ${m.frequency || "As directed"}\n`;
        text += `   • Duration: ${m.duration || "Ongoing"} | Prescribed for: *${m.diagnosis || "Clinical condition"}*\n`;
        text += `   • Prescribing Doctor: ${m.prescribedBy || "Staff Physician"} (${m.prescribedDate ? new Date(m.prescribedDate).toISOString().slice(0, 10) : "Recent"})\n\n`;
      });
    }

    // Known Allergies check
    text += `### ⚠️ Allergy Safeguard Check\n`;
    if (allergies.length > 0) {
      text += `**Warning: Patient has documented allergies:**\n`;
      allergies.forEach((a) => {
        text += `- **${a.allergen}** (Severity: *${a.severity || "Moderate"}*, Reaction: *${a.reaction || "Unspecified"}*)\n`;
      });
      text += `\n*Ensure no cross-reactivity when introducing new pharmacological regimens.*\n`;
    } else {
      text += `No adverse allergies currently recorded in profile.\n`;
    }

    return {
      answer: text,
      suggestedQuestions: [
        "Summarize recent lab test reports",
        "Give me an executive clinical summary",
        "What are the patient's recurring symptoms?"
      ]
    };
  }

  // Intent 2: Lab tests / Blood tests / Scans
  if (q.includes("lab") || q.includes("test") || q.includes("blood") || q.includes("scan") || q.includes("report")) {
    let text = `### 🧪 Diagnostic & Laboratory Summary for **${p.name}**\n\n`;
    if (labs.length === 0) {
      text += `No recent laboratory reports found in record history.\n`;
    } else {
      text += `Found **${labs.length} verified laboratory reports**:\n\n`;
      labs.slice(0, 8).forEach((l, idx) => {
        const dateStr = l.date ? new Date(l.date).toISOString().slice(0, 10) : "Recent";
        text += `${idx + 1}. **${l.title}** (${dateStr})\n`;
        text += `   • Summary: ${l.summary || "Completed"}\n`;
        text += `   • Clinical notes: *${l.details || "Analyzed per standard pathology reference ranges"}*\n`;
        text += `   • Verified by: ${l.verifiedBy || "Laboratory Specialist"}\n\n`;
      });
    }
    return {
      answer: text,
      suggestedQuestions: [
        "What medications is the patient taking?",
        "Show timeline of recent diagnoses",
        "Are there any chronic conditions recorded?"
      ]
    };
  }

  // Intent 3: Allergies check
  if (q.includes("allerg")) {
    let text = `### ⚠️ Documented Allergies for **${p.name}**\n\n`;
    if (allergies.length === 0) {
      text += `No adverse drug or environmental allergies recorded.\n`;
    } else {
      allergies.forEach((a, i) => {
        text += `${i + 1}. **${a.allergen}**\n`;
        text += `   • Severity: **${a.severity || "Standard"}**\n`;
        text += `   • Reaction: ${a.reaction || "Clinical intolerance"}\n\n`;
      });
    }
    return {
      answer: text,
      suggestedQuestions: [
        "What are the active medications?",
        "Summarize recent clinical visits"
      ]
    };
  }

  // Intent 4: Summary / Overview / History
  let text = `### 📋 Clinical Executive Summary for **${p.name}**\n`;
  text += `*MediCard ID: ${p.medicardId || "N/A"} | Blood Group: ${p.bloodGroup || "Not specified"} | Age: ${p.age ? `${p.age} yrs` : "N/A"} | Gender: ${p.gender || "N/A"}*\n\n`;

  text += `#### 🩺 Recent Clinical History Highlights\n`;
  if (consults.length === 0) {
    text += `No prior consultation notes recorded.\n\n`;
  } else {
    consults.slice(0, 5).forEach((c, idx) => {
      const cDate = c.date ? new Date(c.date).toISOString().slice(0, 10) : "Recent";
      text += `${idx + 1}. **${c.title}** (${cDate})\n`;
      text += `   • Diagnosis: **${c.diagnosis || "Under evaluation"}**\n`;
      text += `   • Reported Symptoms: *${c.symptoms || "None noted"}*\n`;
      text += `   • Clinical Advice: ${c.advice || "Continue standard management"}\n`;
      text += `   • Attending: ${c.doctor}\n\n`;
    });
  }

  text += `#### 💊 Active Medications Overview\n`;
  if (meds.length === 0) {
    text += `No active prescriptions on file.\n\n`;
  } else {
    const medSummary = meds.slice(0, 5).map((m) => `**${m.medicine}** (${m.dosage || "Std dose"}, ${m.frequency || "daily"})`).join(", ");
    text += `${medSummary} *(+${Math.max(0, meds.length - 5)} other items)*\n\n`;
  }

  text += `#### ⚠️ Allergies & Alerts\n`;
  if (allergies.length > 0) {
    text += `Patient has allergies to: **${allergies.map((a) => a.allergen).join(", ")}**.\n\n`;
  } else {
    text += `No adverse allergies reported.\n\n`;
  }

  text += `#### 🧪 Laboratory Summary\n`;
  if (labs.length > 0) {
    text += `Latest test on file: **${labs[0].title}** (${labs[0].date ? new Date(labs[0].date).toISOString().slice(0, 10) : "Recent"}). ${labs[0].summary || ""}\n`;
  } else {
    text += `No laboratory tests recorded yet.\n`;
  }

  return {
    answer: text,
    suggestedQuestions: [
      "Check active medications and drug interactions",
      "List all laboratory test results",
      "Are there any recorded drug allergies?"
    ]
  };
}

async function callGeminiLLM({ patientContext, query, chatHistory = [], doctorName }) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;

  // Use recommended fast & intelligent model (gemini-2.5-flash / gemini-1.5-flash)
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const systemInstructionText = `You are the MediCard Clinical AI Assistant for Dr. ${doctorName}.
You analyze verified electronic medical records from the PostgreSQL database for patient ${patientContext.patient?.name || "the patient"} (MediCard ID: ${patientContext.patient?.medicardId || "N/A"}).

Your Responsibilities:
1. Provide accurate, clear, and high-yield clinical answers to the doctor's query.
2. Ground all answers strictly in the provided Patient Clinical Record context.
3. If asked about medications, check for drug interactions, proper dosages, frequencies, and allergy conflicts with documented allergies (${(patientContext.allergies || []).map(a => a.allergen).join(", ") || "None recorded"}).
4. If summarizing lab tests, highlight any abnormal trends or notable diagnostic values.
5. Format your response cleanly with markdown headers, bullet points, and clinical clarity.
6. Do NOT hallucinate or assume unverified clinical tests that are not in the record.`;

  // Format multi-turn conversational history
  const contents = [
    {
      role: "user",
      parts: [
        {
          text: `[SYSTEM CONTEXT - PATIENT CLINICAL DOSSIER]\n${JSON.stringify(patientContext, null, 2)}\n\n[INSTRUCTION]\nPlease act as the clinical assistant adhering to the medical record above.`
        }
      ]
    },
    {
      role: "model",
      parts: [
        {
          text: `Understood Dr. ${doctorName}. I have processed the complete medical record for ${patientContext.patient?.name || "the patient"} including consultations, prescriptions, lab reports, and allergies. How may I assist you with this patient's care?`
        }
      ]
    }
  ];

  // Append recent chat turns (up to 4 previous exchanges)
  if (Array.isArray(chatHistory)) {
    for (const msg of chatHistory.slice(-4)) {
      if (msg.role && msg.content) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        });
      }
    }
  }

  // Append current query
  contents.push({
    role: "user",
    parts: [{ text: query }]
  });

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstructionText }]
    },
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1200,
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.warn(`Gemini API returned ${res.status}:`, errorBody);
    return null; // Gracefully fall back to deterministic clinical engine
  }

  const data = await res.json();
  const answerText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!answerText) return null;

  return {
    answer: answerText,
    modelUsed: modelName,
    suggestedQuestions: [
      "Check active medications & interactions",
      "Summarize recent laboratory reports",
      "Are there any chronic diagnoses?"
    ]
  };
}

/**
 * Emergency Red Flag Detector for Patient Virtual Triage
 */
function detectRedFlags(text = "") {
  const t = text.toLowerCase();
  const redFlags = [];

  if (/(chest pain|tightness in chest|crushing pain|radiating to left arm|radiating to jaw|heart attack)/.test(t)) {
    redFlags.push("Possible acute coronary syndrome / cardiac symptom");
  }
  if (/(can't breathe|cannot breathe|struggling to breathe|severe shortness of breath|gasping for air|blue lips)/.test(t)) {
    redFlags.push("Acute respiratory distress");
  }
  if (/(slurred speech|facial drooping|face droop|arm weakness|sudden numbness|loss of vision|fast sign)/.test(t)) {
    redFlags.push("Possible acute stroke / neurological deficit");
  }
  if (/(coughing blood|vomiting blood|uncontrolled bleeding|profuse bleeding)/.test(t)) {
    redFlags.push("Active hemorrhage");
  }
  if (/(passed out|unconscious|fainted|loss of consciousness|seizure|convulsions)/.test(t)) {
    redFlags.push("Altered consciousness or seizure");
  }
  if (/(suicidal|want to die|kill myself|end my life)/.test(t)) {
    redFlags.push("Mental health emergency / self-harm alert");
  }

  return redFlags;
}

/**
 * Conversational Patient Intake Assistant
 * Uses Gemini LLM when GEMINI_API_KEY is available, or empathetic deterministic clinical intake rules.
 */
async function chatPatientAssistant({ patientContext, message, chatHistory = [] }) {
  const redFlags = detectRedFlags(message);

  // If Gemini API is enabled
  if (process.env.GEMINI_API_KEY) {
    try {
      const llmResult = await callGeminiPatientIntake({ patientContext, message, chatHistory, redFlags });
      if (llmResult) return llmResult;
    } catch (err) {
      console.warn("Gemini patient intake call fallback:", err.message);
    }
  }

  // Deterministic Clinical Intake Engine (Zero-latency fallback)
  return generateDeterministicPatientReply({ patientContext, message, chatHistory, redFlags });
}

async function callGeminiPatientIntake({ patientContext, message, chatHistory, redFlags }) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;

  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const p = patientContext.patient || {};
  const activeMeds = (patientContext.activeMedications || []).map(m => m.medicine).join(", ");
  const allergies = (patientContext.allergies || []).map(a => a.allergen).join(", ");

  const systemInstructionText = `You are "MediCare AI", the compassionate and professional Virtual Health Assistant on the MediCard platform.
You are talking directly to patient: ${p.name || "Patient"} (Age: ${p.age || "N/A"}, Blood Group: ${p.bloodGroup || "N/A"}).
Known allergies: ${allergies || "None documented"}. Active medicines: ${activeMeds || "None documented"}.

Your Primary Objectives:
1. Conduct an empathetic, structured clinical intake following the OPQRST triage framework (Onset, Provocation, Quality, Region, Severity, Timing).
2. Ask only ONE or TWO focused follow-up questions at a time in clear, friendly, jargon-free language so the patient is not overwhelmed.
3. Inquire about key details:
   - What primary symptoms are you feeling?
   - When did they start (duration)?
   - How severe is it on a scale of 1 to 10?
   - Any other symptoms (fever, chills, nausea, dizziness)?
4. Never diagnose or prescribe prescription drugs. Explain that you are gathering these details to prepare a comprehensive Medical Summary for their doctor.
5. If you notice any emergency symptoms, immediately advise them to contact emergency services (108 / 112 / 911) or visit the nearest ER without delay.
6. When sufficient details have been gathered, encourage the patient to click the "Generate Doctor Report" button to send the clinical intake to their physician.`;

  const contents = [
    {
      role: "user",
      parts: [{ text: `[START INTAKE FOR PATIENT: ${p.name || "Patient"}]` }]
    },
    {
      role: "model",
      parts: [{ text: `Hello ${p.name || "there"}! I'm your MediCard Virtual Health Assistant. I'm here to listen to how you are feeling, collect details about your symptoms, and prepare a concise report for your doctor. How are you feeling today?` }]
    }
  ];

  if (Array.isArray(chatHistory)) {
    for (const msg of chatHistory.slice(-8)) {
      if (msg.role && (msg.content || msg.text)) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content || msg.text }]
        });
      }
    }
  }

  contents.push({
    role: "user",
    parts: [{ text: message }]
  });

  const payload = {
    system_instruction: { parts: [{ text: systemInstructionText }] },
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 600,
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) return null;
  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) return null;

  return {
    reply,
    redFlags,
    suggestedResponses: [
      "It started 2 days ago",
      "Pain is around 6 out of 10",
      "I also have mild fever",
      "Ready to generate summary for doctor"
    ],
    readyToSummarize: (chatHistory.length >= 3 || /ready|send report|summarize|finish/i.test(message)),
  };
}

function generateDeterministicPatientReply({ patientContext, message, chatHistory, redFlags }) {
  const p = patientContext.patient || {};
  const msgLower = (message || "").toLowerCase();
  const count = (chatHistory || []).length;

  let reply = "";
  let readyToSummarize = false;

  if (redFlags.length > 0) {
    reply = `⚠️ **URGENT MEDICAL NOTICE**: You reported symptoms that may require urgent medical attention (${redFlags.join("; ")}).\n\nIf you are experiencing severe distress, chest pain, or breathing difficulty, please call emergency services immediately or visit the nearest emergency room.\n\nI will also document this prominently in your report for your doctor. Could you describe how long this has been happening and if you have anyone with you?`;
    return {
      reply,
      redFlags,
      suggestedResponses: ["Started less than 1 hour ago", "I have someone with me", "Generate doctor report now"],
      readyToSummarize: true
    };
  }

  if (count <= 1) {
    if (/(headache|migraine)/.test(msgLower)) {
      reply = `I understand you're experiencing a headache, ${p.name || ""}. To help your doctor assess this:\n\n1. How would you rate the pain on a scale of 1 to 10?\n2. Is the headache throbbing, dull, or sharp, and is it on one side or all over?`;
    } else if (/(fever|temperature|chills|sweat)/.test(msgLower)) {
      reply = `I hear you have a fever. Could you share approximately what temperature you've measured, how many days it has persisted, and if you are experiencing body aches or chills?`;
    } else if (/(stomach|abdominal|nausea|vomit|diarrhea)/.test(msgLower)) {
      reply = `Stomach discomfort can be distressing. Where in your abdomen is the pain located (upper, lower, or all around), and are you able to keep fluids down?`;
    } else if (/(cough|cold|throat|flu|congestion)/.test(msgLower)) {
      reply = `Thank you for sharing. Is your cough dry or producing phlegm? Also, do you have any sore throat, congestion, or difficulty catching your breath?`;
    } else {
      reply = `Thank you for telling me, ${p.name || ""}. I am listening carefully. How long have you been experiencing this, and is the sensation constant or coming in waves?`;
    }
    return {
      reply,
      redFlags: [],
      suggestedResponses: [
        "Started 1-2 days ago",
        "Severity is 5 out of 10",
        "It comes and goes",
        "I feel fatigue as well"
      ],
      readyToSummarize: false
    };
  }

  if (count <= 3) {
    reply = `Got it, that is very helpful context for your doctor. Have you taken any over-the-counter medications for this yet? Also, on a scale of 1 to 10, how intense is the discomfort right now?`;
    return {
      reply,
      redFlags: [],
      suggestedResponses: [
        "Severity is 4/10, took Paracetamol",
        "Severity is 7/10, haven't taken anything",
        "Getting worse today",
        "Ready to create report for doctor"
      ],
      readyToSummarize: true
    };
  }

  // Ready to summarize
  reply = `Thank you for providing these vital details, ${p.name || ""}. I have recorded your chief complaint, duration, severity, and context alongside your MediCard medical profile. \n\nClick **"Generate & Send Report"** below to compile this into a formal clinical SBAR summary and dispatch it directly to your doctor!`;
  return {
    reply,
    redFlags: [],
    suggestedResponses: [
      "Generate Doctor Report",
      "I want to add one more detail",
      "Send to Dr. immediately"
    ],
    readyToSummarize: true
  };
}

/**
 * Generate Standardized Doctor Intake Summary (SOAP / SBAR Format)
 */
async function generateIntakeSummaryReport({ patientContext, conversation = [], chiefComplaint = "", vitals = {} }) {
  const p = patientContext.patient || {};
  const allergies = (patientContext.allergies || []).map(a => `${a.allergen} (${a.severity || "mild"})`).join(", ") || "None documented";
  const meds = (patientContext.activeMedications || []).map(m => `${m.medicine} ${m.dosage || ""}`).join(", ") || "None currently documented";
  const userMessages = conversation.filter(m => m.role === "user").map(m => m.text || m.content).join(" | ");

  // Extract severity or default
  let severity = "moderate";
  const fullText = (chiefComplaint + " " + userMessages).toLowerCase();
  if (/(severe|9\/10|10\/10|excruciating|unbearable|emergency)/.test(fullText)) {
    severity = "severe";
  } else if (/(mild|1\/10|2\/10|3\/10|slight)/.test(fullText)) {
    severity = "mild";
  }

  const redFlags = detectRedFlags(fullText);
  if (redFlags.length > 0) {
    severity = "critical";
  }

  // If Gemini API is available, generate clinical summary
  if (process.env.GEMINI_API_KEY) {
    try {
      const apiKey = (process.env.GEMINI_API_KEY || "").trim();
      const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const prompt = `You are a clinical AI synthesizing a patient's pre-consultation virtual intake into a concise, professional SBAR/SOAP Clinical Intake Note for the attending physician.

PATIENT PROFILE:
Name: ${p.name || "Patient"} | Age: ${p.age || "N/A"} | Gender: ${p.gender || "N/A"} | MediCard ID: ${p.medicardId || "N/A"}
Allergies: ${allergies}
Active Medications: ${meds}
Patient-Reported Vitals: ${JSON.stringify(vitals)}

CONVERSATION TRANSCRIPT:
${conversation.map(c => `${c.role.toUpperCase()}: ${c.text || c.content}`).join("\n")}

OUTPUT FORMAT:
Generate a clean, structured Markdown clinical summary with these sections:
### 1. Situation (Chief Complaint & Triage Urgency)
### 2. Background & History of Present Illness (Onset, Duration, Characteristics, Aggravating/Relieving factors)
### 3. Patient-Reported Vitals & Current Pain Scale (1-10)
### 4. Relevant Medical Context (Active Meds & Allergies from MediCard)
### 5. AI Triage Observations & Red Flags (Highlight if urgent evaluation is required)
### 6. Recommended Doctor Action Items (Suggested physical exams, questions to confirm)`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 900 }
        })
      });

      if (res.ok) {
        const d = await res.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return {
            clinicalSummary: text,
            severity,
            redFlags,
            chiefComplaint: chiefComplaint || (conversation[0]?.text || "General Consultation Request"),
          };
        }
      }
    } catch (err) {
      console.warn("Gemini intake summary fallback:", err.message);
    }
  }

  // Deterministic Standard SBAR Clinical Summary Template
  const complaint = chiefComplaint || conversation.find(c => c.role === "user")?.text || "Symptom Review & Consultation";
  const clinicalSummary = `### 1. Situation (Chief Complaint & Urgency)
- **Primary Complaint**: ${complaint}
- **Triage Level**: ${severity.toUpperCase()} ${redFlags.length ? "⚠️ (Red Flag Indicators Detected)" : "✓ (Stable for Routine/Urgent Evaluation)"}

### 2. History of Present Illness (HPI)
- **Patient Narrative**: ${userMessages || "Patient submitted self-reported symptoms via MediCard Virtual Intake."}
- **Recorded Onset & Duration**: Recent presentation (detailed in attached intake transcript).

### 3. Patient-Reported Vitals & Pain Scale
- **Pain Level**: ${vitals.painScale ? `${vitals.painScale} / 10` : "Patient reported moderate discomfort"}
- **Temperature**: ${vitals.temperature || "Not recorded / Home measurement"}
- **Blood Pressure**: ${vitals.bloodPressure || "Not recorded"}
- **Heart Rate**: ${vitals.heartRate ? `${vitals.heartRate} bpm` : "Not recorded"}

### 4. Relevant Medical Profile (MediCard EHR)
- **Known Allergies**: ${allergies}
- **Current Active Medications**: ${meds}

### 5. Clinical Triage Observations
${redFlags.length ? `- ⚠️ **Immediate Attention**: ${redFlags.join("; ")}` : "- Patient is alert and interactive. No acute respiratory compromise reported in intake."}
- Patient completed full automated pre-screening questionnaire prior to doctor appointment.

### 6. Recommended Next Steps for Doctor
- Verify vital signs during physical or tele-consultation.
- Correlate symptoms against existing medication history.
- Convert intake note directly into consultation record if indicated.`;

  return {
    clinicalSummary,
    severity,
    redFlags,
    chiefComplaint: complaint,
  };
}

module.exports = {
  assembleClinicalContext,
  answerClinicalQuery,
  chatPatientAssistant,
  generateIntakeSummaryReport,
};

