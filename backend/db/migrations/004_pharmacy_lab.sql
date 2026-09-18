-- MediCard Pharmacy + Lab portal support
-- Adds a dispensing lifecycle to prescriptions and hospital scoping to
-- lab requests so pharmacy and diagnostic staff work from a real queue.

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','dispensed','cancelled'));

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS dispensed_by BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions (status);

ALTER TABLE lab_requests
  ADD COLUMN IF NOT EXISTS hospital_id BIGINT REFERENCES hospitals(id) ON DELETE SET NULL;

ALTER TABLE lab_requests
  ADD COLUMN IF NOT EXISTS assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lab_requests_hospital_status ON lab_requests (hospital_id, status);
