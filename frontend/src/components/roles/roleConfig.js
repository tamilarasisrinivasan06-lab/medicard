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
    description: 'Personal Health Records',
    idLabel: ROLE_ID_LABELS.patient,
    placeholder: ROLE_PLACEHOLDERS.patient,
    icon: 'patient',
    color: '#0284c7',
    soft: '#e0f2fe',
  },
  doctor: {
    key: 'doctor',
    role: 'doctor',
    label: 'Doctor',
    description: 'Clinical Consultations & Care',
    idLabel: ROLE_ID_LABELS.doctor,
    placeholder: ROLE_PLACEHOLDERS.doctor,
    icon: 'doctor',
    color: '#2563eb',
    soft: '#dbeafe',
  },
  hospital: {
    key: 'hospital',
    role: 'hospital',
    label: 'Hospital',
    description: 'Administration & Departments',
    idLabel: ROLE_ID_LABELS.hospital,
    placeholder: ROLE_PLACEHOLDERS.hospital,
    icon: 'hospital',
    color: '#0d9488',
    soft: '#ccfbf1',
  },
  admin: {
    key: 'admin',
    role: 'admin',
    label: 'Admin',
    description: 'Operations Management',
    idLabel: ROLE_ID_LABELS.admin,
    placeholder: ROLE_PLACEHOLDERS.admin,
    icon: 'admin',
    color: '#475569',
    soft: '#f1f5f9',
  },
  super_admin: {
    key: 'super-admin',
    role: 'super_admin',
    label: 'Super Admin',
    description: 'Global Platform Security',
    idLabel: ROLE_ID_LABELS.super_admin,
    placeholder: ROLE_PLACEHOLDERS.super_admin,
    icon: 'crown',
    color: '#0f172a',
    soft: '#e2e8f0',
  },
  pharmacist: {
    key: 'pharmacist',
    role: 'pharmacist',
    label: 'Pharmacy',
    description: 'Dispensing & Medication Orders',
    idLabel: 'Email address',
    placeholder: 'Enter your email address',
    icon: 'pharmacy',
    color: '#059669',
    soft: '#d1fae5',
  },
  diagnostic_staff: {
    key: 'diagnostic-staff',
    role: 'diagnostic_staff',
    label: 'Lab Technician',
    description: 'Pathology & Diagnostic Scans',
    idLabel: 'Email address',
    placeholder: 'Enter your email address',
    icon: 'lab',
    color: '#6366f1',
    soft: '#e0e7ff',
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