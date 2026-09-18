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
    description: 'Your health records',
    idLabel: ROLE_ID_LABELS.patient,
    placeholder: ROLE_PLACEHOLDERS.patient,
    icon: 'patient',
    color: '#1a73e8',
    soft: '#eaf2fe',
  },
  doctor: {
    key: 'doctor',
    role: 'doctor',
    label: 'Doctor',
    description: 'Patients & consultations',
    idLabel: ROLE_ID_LABELS.doctor,
    placeholder: ROLE_PLACEHOLDERS.doctor,
    icon: 'doctor',
    color: '#4f46e5',
    soft: '#eceafe',
  },
  hospital: {
    key: 'hospital',
    role: 'hospital',
    label: 'Hospital',
    description: 'Hospital management',
    idLabel: ROLE_ID_LABELS.hospital,
    placeholder: ROLE_PLACEHOLDERS.hospital,
    icon: 'hospital',
    color: '#0891b2',
    soft: '#e2f5fa',
  },
  admin: {
    key: 'admin',
    role: 'admin',
    label: 'Admin',
    description: 'Platform management',
    idLabel: ROLE_ID_LABELS.admin,
    placeholder: ROLE_PLACEHOLDERS.admin,
    icon: 'admin',
    color: '#1d4ed8',
    soft: '#e8efff',
  },
  super_admin: {
    key: 'super-admin',
    role: 'super_admin',
    label: 'Super Admin',
    description: 'System administration',
    idLabel: ROLE_ID_LABELS.super_admin,
    placeholder: ROLE_PLACEHOLDERS.super_admin,
    icon: 'crown',
    color: '#1e293b',
    soft: '#eef2f7',
  },
  pharmacist: {
    key: 'pharmacist',
    role: 'pharmacist',
    label: 'Pharmacy',
    description: 'Prescriptions & medicines',
    idLabel: 'Email address',
    placeholder: 'Enter your email address',
    icon: 'pharmacy',
    color: '#0d9488',
    soft: '#e2f5f2',
  },
  diagnostic_staff: {
    key: 'diagnostic-staff',
    role: 'diagnostic_staff',
    label: 'Lab Technician',
    description: 'Tests & reports',
    idLabel: 'Email address',
    placeholder: 'Enter your email address',
    icon: 'lab',
    color: '#7c3aed',
    soft: '#f1ecfe',
  },
}

export const ROLE_ORDER = ['patient', 'doctor', 'hospital', 'admin', 'super_admin', 'pharmacist', 'diagnostic_staff']

export const PRIMARY_ROLE_KEYS = ['patient', 'doctor', 'hospital', 'pharmacist', 'diagnostic_staff', 'super_admin']

export const SECONDARY_ROLE_KEYS = []

export function roleConfigForSlug(slug) {
  if (ROLES[slug]) return ROLES[slug]
  return Object.values(ROLES).find((r) => r.key === slug) || null
}

export function slugForRole(role) {
  const entry = Object.values(ROLES).find((r) => r.role === role)
  return entry ? entry.key : null
}