function IconBase({ size = 26, color = 'currentColor', children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// 1. Patient: Heartbeat with User figure
export function PatientIcon({ size = 26, color = '#1a73e8' }) {
  return (
    <IconBase size={size} color={color}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 5v6" />
      <path d="M9 8h6" />
    </IconBase>
  )
}

// 2. Doctor: Clinical Stethoscope
export function DoctorIcon({ size = 26, color = '#4f46e5' }) {
  return (
    <IconBase size={size} color={color}>
      <path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3" />
      <path d="M9 12.5v3.5a3 3 0 0 0 3 3h2" />
      <circle cx="17.5" cy="19" r="2.5" />
      <path d="M3 3h3" />
      <path d="M12 3h3" />
    </IconBase>
  )
}

// 3. Hospital: Health Center Building with Medical Cross
export function HospitalIcon({ size = 26, color = '#0891b2' }) {
  return (
    <IconBase size={size} color={color}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </IconBase>
  )
}

// 4. Pharmacy: Medical Prescription Capsule / Pill
export function PharmacyIcon({ size = 26, color = '#0d9488' }) {
  return (
    <IconBase size={size} color={color}>
      <path d="m10.5 20.5-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z" />
      <path d="m8.5 8.5 7 7" />
      <path d="m6 13 4 4" />
    </IconBase>
  )
}

// 5. Diagnostic Lab: Laboratory Test Tube / Flask
export function LabIcon({ size = 26, color = '#7c3aed' }) {
  return (
    <IconBase size={size} color={color}>
      <path d="M9 3h6" />
      <path d="M10 3v6.5L5.5 17a2 2 0 0 0 1.7 3h9.6a2 2 0 0 0 1.7-3L14 9.5V3" />
      <path d="M8 14h8" />
      <circle cx="10" cy="17" r="1" fill={color} />
      <circle cx="13" cy="16" r="0.75" fill={color} />
    </IconBase>
  )
}

// 6. Super Admin: Shield with Verified Check
export function AdminShieldIcon({ size = 26, color = '#1e293b' }) {
  return (
    <IconBase size={size} color={color}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </IconBase>
  )
}

export function ChevronRightIcon({ size = 18, color = 'currentColor' }) {
  return (
    <IconBase size={size} color={color}>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  )
}

export function ArrowLeftIcon({ size = 18, color = 'currentColor' }) {
  return (
    <IconBase size={size} color={color}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </IconBase>
  )
}

export function EyeIcon({ size = 18 }) {
  return (
    <IconBase size={size}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  )
}

export function EyeOffIcon({ size = 18 }) {
  return (
    <IconBase size={size}>
      <path d="M9.9 4.5A9.8 9.8 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-3.4 4.3" />
      <path d="M6.6 6.6A16.3 16.3 0 0 0 2 12s3.5 7 10 7c1.9 0 3.5-.5 4.9-1.2" />
      <path d="m4 4 16 16" />
      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
    </IconBase>
  )
}

export function BadgeIcon({ size = 18 }) {
  return (
    <IconBase size={size}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="9" cy="11" r="2" />
      <path d="M5.5 16a3.5 3.5 0 0 1 7 0" />
      <path d="M14 9.5h4M14 12.5h4M14 15.5h2" />
    </IconBase>
  )
}

export function LockIcon({ size = 18 }) {
  return (
    <IconBase size={size}>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </IconBase>
  )
}

export function LogoutIcon({ size = 18 }) {
  return (
    <IconBase size={size}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </IconBase>
  )
}

const ICONS = {
  patient: PatientIcon,
  doctor: DoctorIcon,
  hospital: HospitalIcon,
  admin: AdminShieldIcon,
  crown: AdminShieldIcon,
  pharmacy: PharmacyIcon,
  lab: LabIcon,
}

export function RoleIcon({ name, size = 26, color }) {
  const Component = ICONS[name] || PatientIcon
  return <Component size={size} color={color} />
}