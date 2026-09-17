-- MediCard Doctor Portal schema
-- Persistent patient-consented access, consultations, lab workflow,
-- documents, follow-ups, notifications, and audit logging.

-- ---------------------------------------------------------------------------
-- doctor_patient_access
-- A patient grants a doctor access to their medical data. Access is created
-- as 'pending' by the doctor, then accepted/rejected by the patient. An
-- accepted grant expires after a working window and can be revoked anytime.
-- ---------------------------------------------------------------------------
CREATE TABLE doctor_patient_access (
  id            BIGSERIAL PRIMARY KEY,
  doctor_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  patient_id    BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  medicard_id   TEXT NOT NULL,
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','accepted','rejected','revoked','expired')),
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at    TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dpa_doctor ON doctor_patient_access (doctor_id, status);
CREATE INDEX idx_dpa_patient ON doctor_patient_access (patient_id, status);

CREATE TRIGGER trg_doctor_patient_access_updated_at
BEFORE UPDATE ON doctor_patient_access
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- consultations
-- ---------------------------------------------------------------------------
CREATE TABLE consultations (
  id                BIGSERIAL PRIMARY KEY,
  patient_id        BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  appointment_id    BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  symptoms          TEXT,
  diagnosis         TEXT,
  advice_notes      TEXT,
  consultation_date DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('completed','in_progress','follow_up_needed')),
  hospital_name     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultations_patient ON consultations (patient_id);
CREATE INDEX idx_consultations_doctor_date ON consultations (doctor_id, consultation_date DESC);

CREATE TRIGGER trg_consultations_updated_at
BEFORE UPDATE ON consultations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- lab_requests
-- ---------------------------------------------------------------------------
CREATE TABLE lab_requests (
  id              BIGSERIAL PRIMARY KEY,
  patient_id      BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  consultation_id BIGINT REFERENCES consultations(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  tests           TEXT NOT NULL,
  instructions    TEXT,
  priority        TEXT NOT NULL DEFAULT 'routine'
                  CHECK (priority IN ('routine','urgent','stat')),
  status          TEXT NOT NULL DEFAULT 'requested'
                  CHECK (status IN ('requested','in_progress','ready','delivered','cancelled')),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_requests_patient ON lab_requests (patient_id);
CREATE INDEX idx_lab_requests_doctor_status ON lab_requests (doctor_id, status);

CREATE TRIGGER trg_lab_requests_updated_at
BEFORE UPDATE ON lab_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- lab_reports
-- ---------------------------------------------------------------------------
CREATE TABLE lab_reports (
  id            BIGSERIAL PRIMARY KEY,
  patient_id    BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  lab_request_id BIGINT REFERENCES lab_requests(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  summary       TEXT,
  report_text   TEXT,
  file_url      TEXT,
  report_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_reports_patient ON lab_reports (patient_id);
CREATE INDEX idx_lab_reports_doctor ON lab_reports (doctor_id);

CREATE TRIGGER trg_lab_reports_updated_at
BEFORE UPDATE ON lab_reports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- medical_documents (doctor-attached documents for a patient record)
-- ---------------------------------------------------------------------------
CREATE TABLE medical_documents (
  id         BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  category   TEXT NOT NULL DEFAULT 'other',
  title      TEXT NOT NULL,
  notes      TEXT,
  file_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medical_documents_patient ON medical_documents (patient_id);
CREATE INDEX idx_medical_documents_doctor ON medical_documents (doctor_id);

CREATE TRIGGER trg_medical_documents_updated_at
BEFORE UPDATE ON medical_documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- follow_ups
-- ---------------------------------------------------------------------------
CREATE TABLE follow_ups (
  id              BIGSERIAL PRIMARY KEY,
  patient_id      BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  consultation_id BIGINT REFERENCES consultations(id) ON DELETE SET NULL,
  follow_up_date  DATE NOT NULL,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','done','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_ups_doctor_date ON follow_ups (doctor_id, follow_up_date);
CREATE INDEX idx_follow_ups_patient ON follow_ups (patient_id);

CREATE TRIGGER trg_follow_ups_updated_at
BEFORE UPDATE ON follow_ups
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  role        TEXT,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   BIGINT,
  details     JSONB,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs (action, created_at DESC);