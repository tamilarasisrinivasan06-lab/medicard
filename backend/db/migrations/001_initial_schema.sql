-- MediCard initial schema
-- PostgreSQL relational core for the MediCard application.

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- hospitals (referenced by users and doctors)
-- ---------------------------------------------------------------------------
CREATE TABLE hospitals (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  address      TEXT,
  city         TEXT,
  state        TEXT,
  pincode      TEXT,
  phone        TEXT,
  email        TEXT,
  website      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hospitals_city ON hospitals (city);
CREATE INDEX idx_hospitals_state ON hospitals (state);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('patient','doctor','hospital','admin','pharmacist','diagnostic_staff')),
  profile_photo TEXT,
  date_of_birth DATE,
  gender        TEXT,
  hospital_id   BIGINT REFERENCES hospitals(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_hospital_id ON users (hospital_id);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- doctors
-- ---------------------------------------------------------------------------
CREATE TABLE doctors (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  specialization      TEXT,
  qualification       TEXT,
  registration_number TEXT UNIQUE,
  experience          INTEGER CHECK (experience IS NULL OR experience >= 0),
  hospital_id         BIGINT REFERENCES hospitals(id) ON DELETE SET NULL,
  consultation_fee    NUMERIC(10,2) CHECK (consultation_fee IS NULL OR consultation_fee >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doctors_specialization ON doctors (specialization);
CREATE INDEX idx_doctors_hospital_id ON doctors (hospital_id);

CREATE TRIGGER trg_doctors_updated_at
BEFORE UPDATE ON doctors
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- patient_profiles (the patient entity)
-- Deleting a user RESTRICTS, so critical medical data can never be removed
-- by accident through user deletion cascades.
-- ---------------------------------------------------------------------------
CREATE TABLE patient_profiles (
  id                     BIGSERIAL PRIMARY KEY,
  user_id                BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  blood_group            TEXT CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  date_of_birth          DATE,
  gender                 TEXT,
  height                 NUMERIC(5,2) CHECK (height IS NULL OR height > 0),
  weight                 NUMERIC(5,2) CHECK (weight IS NULL OR weight > 0),
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  address                TEXT,
  city                   TEXT,
  state                  TEXT,
  pincode                TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_profiles_city ON patient_profiles (city);

CREATE TRIGGER trg_patient_profiles_updated_at
BEFORE UPDATE ON patient_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- medicards (MediCard ID + QR token, existing feature preserved)
-- ---------------------------------------------------------------------------
CREATE TABLE medicards (
  id           BIGSERIAL PRIMARY KEY,
  patient_id   BIGINT NOT NULL UNIQUE REFERENCES patient_profiles(id) ON DELETE CASCADE,
  medicard_id  TEXT NOT NULL UNIQUE CHECK (medicard_id ~ '^MC-[A-Z0-9]{8}$'),
  qr_code_data TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- medical_records (immutable source; edits are permitted only with grant/admin)
-- ---------------------------------------------------------------------------
CREATE TABLE medical_records (
  id            BIGSERIAL PRIMARY KEY,
  patient_id    BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  record_type   TEXT NOT NULL CHECK (record_type IN ('prescription','lab_report','scan','diagnosis','discharge_summary','vaccination','other')),
  title         TEXT NOT NULL,
  description   TEXT,
  diagnosis     TEXT,
  doctor_name   TEXT,
  hospital_name TEXT,
  record_date   DATE NOT NULL,
  file_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medical_records_patient_id ON medical_records (patient_id);
CREATE INDEX idx_medical_records_record_date ON medical_records (record_date);
CREATE INDEX idx_medical_records_patient_record_date ON medical_records (patient_id, record_date DESC);

CREATE TRIGGER trg_medical_records_updated_at
BEFORE UPDATE ON medical_records
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- medications
-- ---------------------------------------------------------------------------
CREATE TABLE medications (
  id            BIGSERIAL PRIMARY KEY,
  patient_id    BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage        TEXT,
  frequency     TEXT,
  duration      TEXT,
  start_date    DATE,
  end_date      DATE,
  instructions  TEXT,
  prescribed_by TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medications_patient_id ON medications (patient_id);

CREATE TRIGGER trg_medications_updated_at
BEFORE UPDATE ON medications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- allergies
-- ---------------------------------------------------------------------------
CREATE TABLE allergies (
  id         BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  allergen   TEXT NOT NULL,
  reaction   TEXT,
  severity   TEXT CHECK (severity IN ('mild','moderate','severe')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_allergies_patient_id ON allergies (patient_id);

CREATE TRIGGER trg_allergies_updated_at
BEFORE UPDATE ON allergies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- emergency_contacts
-- ---------------------------------------------------------------------------
CREATE TABLE emergency_contacts (
  id              BIGSERIAL PRIMARY KEY,
  patient_id      BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  relationship    TEXT,
  phone           TEXT,
  alternate_phone TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_emergency_contacts_patient_id ON emergency_contacts (patient_id);

CREATE TRIGGER trg_emergency_contacts_updated_at
BEFORE UPDATE ON emergency_contacts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------
CREATE TABLE appointments (
  id               BIGSERIAL PRIMARY KEY,
  patient_id       BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id        BIGINT REFERENCES doctors(id) ON DELETE SET NULL,
  hospital_id      BIGINT REFERENCES hospitals(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  reason           TEXT,
  status           TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_patient_id ON appointments (patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments (doctor_id);
CREATE INDEX idx_appointments_hospital_id ON appointments (hospital_id);
CREATE INDEX idx_appointments_date ON appointments (appointment_date);
CREATE INDEX idx_appointments_status ON appointments (status);

CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- prescriptions
-- ---------------------------------------------------------------------------
CREATE TABLE prescriptions (
  id               BIGSERIAL PRIMARY KEY,
  patient_id       BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id        BIGINT REFERENCES users(id) ON DELETE RESTRICT,
  appointment_id   BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
  diagnosis        TEXT,
  notes            TEXT,
  prescription_date DATE NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prescriptions_patient_id ON prescriptions (patient_id);
CREATE INDEX idx_prescriptions_doctor_id ON prescriptions (doctor_id);
CREATE INDEX idx_prescriptions_date ON prescriptions (prescription_date);

CREATE TRIGGER trg_prescriptions_updated_at
BEFORE UPDATE ON prescriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- prescription_items
-- ---------------------------------------------------------------------------
CREATE TABLE prescription_items (
  id              BIGSERIAL PRIMARY KEY,
  prescription_id BIGINT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name   TEXT NOT NULL,
  dosage          TEXT,
  frequency       TEXT,
  duration        TEXT,
  instructions    TEXT
);

CREATE INDEX idx_prescription_items_prescription_id ON prescription_items (prescription_id);

-- ---------------------------------------------------------------------------
-- file_uploads (metadata only; bytes live in secure object/file storage)
-- ---------------------------------------------------------------------------
CREATE TABLE file_uploads (
  id            BIGSERIAL PRIMARY KEY,
  uploader_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  patient_id    BIGINT REFERENCES patient_profiles(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL CHECK (size_bytes >= 0),
  storage_key   TEXT NOT NULL UNIQUE,
  record_id     BIGINT REFERENCES medical_records(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_file_uploads_patient_id ON file_uploads (patient_id);
CREATE INDEX idx_file_uploads_record_id ON file_uploads (record_id);

-- ---------------------------------------------------------------------------
-- verification_requests (OTP flow, preserved)
-- ---------------------------------------------------------------------------
CREATE TABLE verification_requests (
  id             BIGSERIAL PRIMARY KEY,
  requester_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  patient_id     BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  medicard_id    TEXT NOT NULL,
  role           TEXT NOT NULL,
  otp_hash       TEXT NOT NULL,
  otp_expires_at TIMESTAMPTZ NOT NULL,
  attempts       INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','failed','expired')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_requests_patient_id ON verification_requests (patient_id);
CREATE INDEX idx_verification_requests_status ON verification_requests (status);

-- ---------------------------------------------------------------------------
-- access_grants (short-lived authorization tokens, preserved)
-- ---------------------------------------------------------------------------
CREATE TABLE access_grants (
  id          BIGSERIAL PRIMARY KEY,
  requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  patient_id  BIGINT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  medicard_id TEXT NOT NULL,
  role        TEXT NOT NULL,
  purpose     TEXT NOT NULL,
  token       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_grants_patient_id ON access_grants (patient_id);
CREATE INDEX idx_access_grants_status ON access_grants (status);

-- ---------------------------------------------------------------------------
-- token_blacklist (logout support)
-- ---------------------------------------------------------------------------
CREATE TABLE token_blacklist (
  token_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_token_blacklist_expires_at ON token_blacklist (expires_at);

-- ---------------------------------------------------------------------------
-- password_resets
-- ---------------------------------------------------------------------------
CREATE TABLE password_resets (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_resets_user_id ON password_resets (user_id);