-- MediCard Patient AI Virtual Assistant & Intake System
-- Stores patient AI intake sessions, symptom queries, vital readings,
-- clinical SBAR/SOAP summary reports, and doctor dispatch statuses.

CREATE TABLE IF NOT EXISTS patient_ai_intakes (
  id                 BIGSERIAL PRIMARY KEY,
  patient_id         BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id          BIGINT REFERENCES users(id) ON DELETE SET NULL,
  chief_complaint    TEXT NOT NULL,
  symptoms           TEXT,
  duration           TEXT,
  severity           TEXT DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
  vitals             JSONB DEFAULT '{}'::jsonb,
  transcript         JSONB DEFAULT '[]'::jsonb,
  clinical_summary   TEXT NOT NULL,
  doctor_notes       TEXT,
  status             TEXT NOT NULL DEFAULT 'submitted'
                     CHECK (status IN ('draft', 'submitted', 'reviewed', 'converted_to_consultation')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pai_patient ON patient_ai_intakes (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pai_doctor ON patient_ai_intakes (doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_pai_status ON patient_ai_intakes (status);

CREATE OR REPLACE TRIGGER trg_patient_ai_intakes_updated_at
BEFORE UPDATE ON patient_ai_intakes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
