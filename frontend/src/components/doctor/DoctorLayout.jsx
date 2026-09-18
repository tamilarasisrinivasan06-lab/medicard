import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getDoctorProfile, getDoctorNotifications, getMe, getRole, getToken, logout } from '../../api'
import {
  DashboardIcon,
  PatientsIcon,
  ScanIcon,
  InboxIcon,
  CalendarIcon,
  StethoscopeIcon,
  PillIcon,
  FlaskIcon,
  ReportIcon,
  FolderIcon,
  RepeatIcon,
  ChartIcon,
  BuildingIcon,
  UserIcon,
  BellIcon,
  SettingsIcon,
  ShieldIcon,
} from './icons'
import { ToastProvider } from './ui'
import AppShell from '../layout/AppShell'
import './doctor.css'

const PRIMARY = [
  { to: '/doctor/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/doctor/patients', label: 'Patients', icon: PatientsIcon },
  { to: '/doctor/scan', label: 'Scan Patient Card', icon: ScanIcon },
  { to: '/doctor/appointments', label: 'Appointments', icon: CalendarIcon },
  { to: '/doctor/profile', label: 'Profile', icon: UserIcon },
]

const MORE = [
  { to: '/doctor/access-requests', label: 'Patient Requests', icon: InboxIcon },
  { to: '/doctor/consultations', label: 'Consultations', icon: StethoscopeIcon },
  { to: '/doctor/prescriptions', label: 'Prescriptions', icon: PillIcon },
  { to: '/doctor/lab-requests', label: 'Lab Requests', icon: FlaskIcon },
  { to: '/doctor/lab-reports', label: 'Lab Reports', icon: ReportIcon },
  { to: '/doctor/documents', label: 'Medical Records', icon: FolderIcon },
  { to: '/doctor/follow-ups', label: 'Follow-ups', icon: RepeatIcon },
  { to: '/doctor/analytics', label: 'Analytics', icon: ChartIcon },
  { to: '/doctor/hospital', label: 'Hospital / Clinic', icon: BuildingIcon },
  { to: '/doctor/notifications', label: 'Notifications', icon: BellIcon },
  { to: '/doctor/audit', label: 'Audit Log', icon: ShieldIcon },
  { to: '/doctor/settings', label: 'Settings', icon: SettingsIcon },
]

function DoctorLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const role = getRole()
  const hasToken = Boolean(getToken())
  const [profile, setProfile] = useState(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!hasToken || role !== 'doctor') return
    let active = true
    getDoctorProfile()
      .then((res) => {
        if (active && res.success) setProfile(res.data)
        else return getMe().then((me) => active && me.success && setProfile(me.data.user || me.data))
      })
      .catch(() => {
        getMe().then((me) => active && me.success && setProfile(me.data.user || me.data)).catch(() => {})
      })
    return () => {
      active = false
    }
  }, [hasToken, role])

  useEffect(() => {
    if (!hasToken || role !== 'doctor') return undefined
    let active = true
    const load = () =>
      getDoctorNotifications(true)
        .then((res) => active && res.success && setUnread(res.data.length))
        .catch(() => {})
    load()
    const timer = setInterval(load, 45000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [hasToken, role, location.pathname])

  if (!hasToken || role !== 'doctor') {
    return <Navigate to="/login/doctor" replace />
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const name = profile?.name || 'Doctor'
  const meta = [profile?.specialization, profile?.hospitalName].filter(Boolean).join(' · ')

  return (
    <ToastProvider>
      <AppShell
        portalLabel="Doctor Portal"
        title={name}
        subtitle={meta || 'Doctor'}
        primary={PRIMARY}
        more={MORE}
        user={{ name, meta }}
        unread={unread}
        notificationsTo="/doctor/notifications"
        profileTo="/doctor/profile"
        profileMenu={MORE}
        onLogout={handleLogout}
        context={{ profile, unread, setUnread }}
      />
    </ToastProvider>
  )
}

export default DoctorLayout
