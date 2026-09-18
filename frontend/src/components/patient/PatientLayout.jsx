import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  getMe,
  getMyProfile,
  getPatientPortalNotifications,
  getRole,
  getToken,
  logout,
} from '../../api'
import {
  DashboardIcon,
  QrIcon,
  UserCheckIcon,
  PillIcon,
  StoreIcon,
  DropletIcon,
  ScanIcon,
  FolderIcon,
  ClockIcon,
  CalendarIcon,
  RepeatIcon,
  BellIcon,
  UserIcon,
  SettingsIcon,
} from '../doctor/icons'
import { ToastProvider } from '../doctor/ui'
import AppShell from '../layout/AppShell'
import '../doctor/doctor.css'

const PRIMARY = [
  { to: '/patient/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/patient/history', label: 'Medical History', icon: ClockIcon },
  { to: '/patient/scans', label: 'Scan Reports', icon: ScanIcon },
  { to: '/patient/prescriptions', label: 'Medicines', icon: PillIcon },
  { to: '/patient/appointments', label: 'Appointments', icon: CalendarIcon },
  { to: '/patient/profile', label: 'Profile', icon: UserIcon },
]

const MORE = [
  { to: '/patient/medi-card', label: 'My Medi Card', icon: QrIcon },
  { to: '/patient/doctors', label: 'Doctors', icon: UserCheckIcon },
  { to: '/patient/pharmacy', label: 'Pharmacy', icon: StoreIcon },
  { to: '/patient/blood-tests', label: 'Blood Tests', icon: DropletIcon },
  { to: '/patient/records', label: 'Medical Documents', icon: FolderIcon },
  { to: '/patient/doctor-access', label: 'Doctor Access', icon: UserCheckIcon },
  { to: '/patient/follow-ups', label: 'Follow-ups', icon: RepeatIcon },
  { to: '/patient/notifications', label: 'Notifications', icon: BellIcon },
  { to: '/patient/settings', label: 'Settings & Access History', icon: SettingsIcon },
]

const PROFILE_MENU = [
  { to: '/patient/history', label: 'Medical History', icon: ClockIcon },
  { to: '/patient/doctors', label: 'Doctors', icon: UserCheckIcon },
  { to: '/patient/prescriptions', label: 'Prescriptions', icon: PillIcon },
  { to: '/patient/pharmacy', label: 'Pharmacy', icon: StoreIcon },
  { to: '/patient/blood-tests', label: 'Lab Reports', icon: DropletIcon },
  { to: '/patient/scans', label: 'Scan Reports', icon: ScanIcon },
  { to: '/patient/records', label: 'Documents', icon: FolderIcon },
  { to: '/patient/doctor-access', label: 'Access Requests', icon: UserCheckIcon },
  { to: '/patient/appointments', label: 'Appointments', icon: CalendarIcon },
  { to: '/patient/follow-ups', label: 'Follow-ups', icon: RepeatIcon },
  { to: '/patient/notifications', label: 'Notifications', icon: BellIcon },
  { to: '/patient/settings', label: 'Settings', icon: SettingsIcon },
]

function PatientLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const role = getRole()
  const hasToken = Boolean(getToken())
  const [profile, setProfile] = useState(null)
  const [unread, setUnread] = useState(0)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!hasToken || role !== 'patient') return undefined
    let active = true
    getMyProfile()
      .then((res) => {
        if (active && res.success) setProfile(res.data)
      })
      .catch(() => {})
    getMe()
      .then((res) => {
        if (!active || !res.success) return
        const user = res.data?.user || res.data
        setProfile((prev) => ({ ...(prev || {}), email: user?.email, name: prev?.name || user?.fullName }))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [hasToken, role])

  useEffect(() => {
    if (!hasToken || role !== 'patient') return undefined
    let active = true
    const load = () =>
      getPatientPortalNotifications(true)
        .then((res) => {
          if (!active || !res.success) return
          setUnread(res.meta?.unread ?? (res.data?.length || 0))
        })
        .catch(() => {})
    load()
    const timer = setInterval(load, 45000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [hasToken, role, location.pathname])

  if (!hasToken || role !== 'patient') {
    return <Navigate to="/login/patient" replace />
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function handleSearch() {
    const q = query.trim()
    if (q.length < 2) return
    navigate(`/patient/search?q=${encodeURIComponent(q)}`)
    setQuery('')
  }

  const name = profile?.name || 'Patient'
  const meta = [profile?.medicardId, profile?.bloodGroup].filter(Boolean).join(' · ')

  return (
    <ToastProvider>
      <AppShell
        portalLabel="Patient Portal"
        title={name}
        subtitle={meta || 'Patient'}
        primary={PRIMARY}
        more={MORE}
        user={{ name, meta }}
        unread={unread}
        notificationsTo="/patient/notifications"
        profileTo="/patient/profile"
        profileMenu={PROFILE_MENU}
        onLogout={handleLogout}
        search={{ value: query, onChange: setQuery, onSubmit: handleSearch, placeholder: 'Search records, doctors…' }}
        context={{ profile, unread, setUnread }}
      />
    </ToastProvider>
  )
}

export default PatientLayout
