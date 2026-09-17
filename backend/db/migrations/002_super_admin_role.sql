ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('patient', 'doctor', 'hospital', 'admin', 'super_admin', 'pharmacist', 'diagnostic_staff'));