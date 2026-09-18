function Icon({ children, size = 22, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function PatientIcon({ size }) {
  return (
    <Icon size={size}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  )
}

export function DoctorIcon({ size }) {
  return (
    <Icon size={size}>
      <path d="M8 3v4a4 4 0 0 0 8 0V3" />
      <path d="M4 5v2a8 8 0 0 0 16 0V5" />
      <path d="M12 11v8a3 3 0 0 1-3 3H7" />
    </Icon>
  )
}

export function HospitalIcon({ size }) {
  return (
    <Icon size={size}>
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
      <path d="M9 21v-4h6v4" />
      <path d="M12 6v4" />
      <path d="M10 8h4" />
    </Icon>
  )
}

export function AdminIcon({ size }) {
  return (
    <Icon size={size}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  )
}

export function CrownIcon({ size }) {
  return (
    <Icon size={size}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m12 11 1.1 2.2 2.4.4-1.7 1.7.4 2.4-2.2-1.2-2.2 1.2.4-2.4L8.5 13.6l2.4-.4L12 11z" />
    </Icon>
  )
}

export function ChevronRightIcon({ size }) {
  return (
    <Icon size={size}>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  )
}

export function EyeIcon({ size }) {
  return (
    <Icon size={size}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  )
}

export function EyeOffIcon({ size }) {
  return (
    <Icon size={size}>
      <path d="M9.9 4.5A9.8 9.8 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-3.4 4.3" />
      <path d="M6.6 6.6A16.3 16.3 0 0 0 2 12s3.5 7 10 7c1.9 0 3.5-.5 4.9-1.2" />
      <path d="m4 4 16 16" />
      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
    </Icon>
  )
}

export function ArrowLeftIcon({ size }) {
  return (
    <Icon size={size}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </Icon>
  )
}

export function BadgeIcon({ size }) {
  return (
    <Icon size={size}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="9" cy="11" r="2" />
      <path d="M5.5 16a3.5 3.5 0 0 1 7 0" />
      <path d="M14 9.5h4M14 12.5h4M14 15.5h2" />
    </Icon>
  )
}

export function LockIcon({ size }) {
  return (
    <Icon size={size}>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  )
}

export function LogoutIcon({ size }) {
  return (
    <Icon size={size}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </Icon>
  )
}

export function PharmacyIcon({ size }) {
  return (
    <Icon size={size}>
      <path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z" />
      <path d="m8.5 8.5 7 7" />
    </Icon>
  )
}

export function LabIcon({ size }) {
  return (
    <Icon size={size}>
      <path d="M9 3h6" />
      <path d="M10 3v6.5L5.5 17a2 2 0 0 0 1.7 3h9.6a2 2 0 0 0 1.7-3L14 9.5V3" />
      <path d="M7.5 15h9" />
    </Icon>
  )
}

const ICONS = {
  patient: PatientIcon,
  doctor: DoctorIcon,
  hospital: HospitalIcon,
  admin: AdminIcon,
  crown: CrownIcon,
  pharmacy: PharmacyIcon,
  lab: LabIcon,
}

export function RoleIcon({ name, size }) {
  const Cmp = ICONS[name] || PatientIcon
  return <Cmp size={size || 22} />
}