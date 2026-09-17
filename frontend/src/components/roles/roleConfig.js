export const ROLE_ID_LABELS = {
  patient: 'Email address',
  doctor: 'Email address',
  hospital: 'Email address',
  admin: 'Email address',
  super_admin: 'Email address',
}

export const ROLE_PLACEHOLDERS = {
  patient: 'Enter your email address',
  doctor: 'Enter your email address',
  hospital: 'Enter your email address',
  admin: 'Enter your email address',
  super_admin: 'Enter your email address',
}

export const ROLES = {
  patient: {
    key: 'patient',
    role: 'patient',
    label: 'Patient',
    idLabel: ROLE_ID_LABELS.patient,
    placeholder: ROLE_PLACEHOLDERS.patient,
    icon: 'patient',
    color: '#2563eb',
  },
  doctor: {
    key: 'doctor',
    role: 'doctor',
    label: 'Doctor',
    idLabel: ROLE_ID_LABELS.doctor,
    placeholder: ROLE_PLACEHOLDERS.doctor,
    icon: 'doctor',
    color: '#1d4ed8',
  },
  hospital: {
    key: 'hospital',
    role: 'hospital',
    label: 'Hospital',
    idLabel: ROLE_ID_LABELS.hospital,
    placeholder: ROLE_PLACEHOLDERS.hospital,
    icon: 'hospital',
    color: '#3b82f6',
  },
  admin: {
    key: 'admin',
    role: 'admin',
    label: 'Admin',
    idLabel: ROLE_ID_LABELS.admin,
    placeholder: ROLE_PLACEHOLDERS.admin,
    icon: 'admin',
    color: '#1e3a8a',
  },
  super_admin: {
    key: 'super-admin',
    role: 'super_admin',
    label: 'Super Admin',
    idLabel: ROLE_ID_LABELS.super_admin,
    placeholder: ROLE_PLACEHOLDERS.super_admin,
    icon: 'crown',
    color: '#172554',
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