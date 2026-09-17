export const ROLE_ID_LABELS = {
  patient: 'Patient ID',
  doctor: 'Doctor ID',
  hospital: 'Hospital ID',
  admin: 'Admin ID',
  super_admin: 'Super Admin ID',
}

export const ROLE_PLACEHOLDERS = {
  patient: 'Enter your Patient ID',
  doctor: 'Enter your Doctor ID',
  hospital: 'Enter your Hospital ID',
  admin: 'Enter your Admin ID',
  super_admin: 'Enter your Super Admin ID',
}

export const ROLES = {
  patient: {
    key: 'patient',
    role: 'patient',
    label: 'Patient',
    idLabel: ROLE_ID_LABELS.patient,
    placeholder: ROLE_PLACEHOLDERS.patient,
    icon: 'patient',
    color: '#0eadc8',
  },
  doctor: {
    key: 'doctor',
    role: 'doctor',
    label: 'Doctor',
    idLabel: ROLE_ID_LABELS.doctor,
    placeholder: ROLE_PLACEHOLDERS.doctor,
    icon: 'doctor',
    color: '#2b9e64',
  },
  hospital: {
    key: 'hospital',
    role: 'hospital',
    label: 'Hospital',
    idLabel: ROLE_ID_LABELS.hospital,
    placeholder: ROLE_PLACEHOLDERS.hospital,
    icon: 'hospital',
    color: '#d88a1d',
  },
  admin: {
    key: 'admin',
    role: 'admin',
    label: 'Admin',
    idLabel: ROLE_ID_LABELS.admin,
    placeholder: ROLE_PLACEHOLDERS.admin,
    icon: 'admin',
    color: '#5b5bd6',
  },
  super_admin: {
    key: 'super-admin',
    role: 'super_admin',
    label: 'Super Admin',
    idLabel: ROLE_ID_LABELS.super_admin,
    placeholder: ROLE_PLACEHOLDERS.super_admin,
    icon: 'crown',
    color: '#a04be1',
  },
}

export const ROLE_ORDER = ['patient', 'doctor', 'hospital', 'admin', 'super_admin']

export function roleConfigForSlug(slug) {
  if (ROLES[slug]) return ROLES[slug]
  return Object.values(ROLES).find((r) => r.key === slug) || null
}

export function slugForRole(role) {
  const entry = Object.values(ROLES).find((r) => r.role === role)
  return entry ? entry.key : null
}