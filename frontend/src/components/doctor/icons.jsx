function Svg({ size = 20, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function DashboardIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  )
}

export function PatientsIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 8.5a2.8 2.8 0 0 1 0 5.6" />
      <path d="M18 20a5.2 5.2 0 0 0-2-4.1" />
    </Svg>
  )
}

export function ScanIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" />
      <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
      <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" />
      <path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="M4 12h16" />
    </Svg>
  )
}

export function InboxIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3 12h4l1.5 3h7L17 12h4" />
      <path d="M5 5h14l2 7v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-6z" />
    </Svg>
  )
}

export function CalendarIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="1.8" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </Svg>
  )
}

export function StethoscopeIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 3v5a4 4 0 0 0 8 0V3" />
      <path d="M6 3H4.5M14 3h1.5" />
      <path d="M10 12v3a5 5 0 0 0 10 0v-1.5" />
      <circle cx="20" cy="11" r="1.8" />
    </Svg>
  )
}

export function PillIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)" />
      <path d="M9.5 9.5 14.5 14.5" />
    </Svg>
  )
}

export function FlaskIcon(props) {
  return (
    <Svg {...props}>
      <path d="M9 3h6" />
      <path d="M10 3v6.5L5.2 17.6A2 2 0 0 0 7 20h10a2 2 0 0 0 1.8-2.4L14 9.5V3" />
      <path d="M7.5 14h9" />
    </Svg>
  )
}

export function ReportIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6M9 17h6M9 9h2" />
    </Svg>
  )
}

export function FolderIcon(props) {
  return (
    <Svg {...props}>
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9v8.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z" />
    </Svg>
  )
}

export function RepeatIcon(props) {
  return (
    <Svg {...props}>
      <path d="M17 2.5 20 5.5l-3 3" />
      <path d="M20 5.5H8a5 5 0 0 0-5 5" />
      <path d="M7 21.5 4 18.5l3-3" />
      <path d="M4 18.5h12a5 5 0 0 0 5-5" />
    </Svg>
  )
}

export function ChartIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16v-4M12.5 16V8M17 16v-6" />
    </Svg>
  )
}

export function BuildingIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 21V5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 16 5v16" />
      <path d="M16 9h3.5A1.5 1.5 0 0 1 21 10.5V21" />
      <path d="M3 21h19" />
      <path d="M8 7h1.5M8 11h1.5M8 15h1.5M12 7h1M12 11h1M12 15h1" />
    </Svg>
  )
}

export function UserIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  )
}

export function BellIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </Svg>
  )
}

export function SettingsIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </Svg>
  )
}

export function ShieldIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3 19 6v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  )
}

export function LogoutIcon(props) {
  return (
    <Svg {...props}>
      <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" />
      <path d="M10 16.5 14.5 12 10 7.5" />
      <path d="M14.5 12H4" />
    </Svg>
  )
}

export function PlusIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function SearchIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Svg>
  )
}

export function CheckIcon(props) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  )
}

export function CloseIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  )
}

export function MenuIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  )
}

export function ClockIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  )
}

export function TrashIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M6.5 7 7.5 20h9L17.5 7" />
      <path d="M10 11v5M14 11v5" />
    </Svg>
  )
}

export function EditIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 20h4L20 8l-4-4L4 16z" />
      <path d="m14 6 4 4" />
    </Svg>
  )
}

export function HeartIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
    </Svg>
  )
}

export function AlertIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 21 19H3z" />
      <path d="M12 9.5V14M12 16.5v.5" />
    </Svg>
  )
}