import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
  LogoutIcon,
  MenuIcon,
  CloseIcon,
} from './icons'
import { ToastProvider } from './ui'
import './doctor.css'

const NAV = [
  { to: '/doctor/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/doctor/patients', label: 'Patients', icon: PatientsIcon },
  { to: '/doctor/scan', label: 'Scan Patient Card', icon: ScanIcon },
  { to: '/doctor/access-requests', label: 'Patient Requests', icon: InboxIcon },
  { to: '/doctor/appointments', label: 'Appointments', icon: CalendarIcon },
  { to: '/doctor/consultations', label: 'Consultations', icon: StethoscopeIcon },
  { to: '/doctor/prescriptions', label: 'Prescriptions', icon: PillIcon },
  { to: '/doctor/lab-requests', label: 'Lab Requests', icon: FlaskIcon },
  { to: '/doctor/lab-reports', label: 'Lab Reports', icon: ReportIcon },
  { to: '/doctor/documents', label: 'Medical Records', icon: FolderIcon },
  { to: '/doctor/follow-ups', label: 'Follow-ups', icon: RepeatIcon },
  { to: '/doctor/analytics', label: 'Analytics', icon: ChartIcon },
  { to: '/doctor/hospital', label: 'My Hospital / Clinic', icon: BuildingIcon },
  { to: '/doctor/profile', label: 'My Profile', icon: UserIcon },
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
  const [drawerOpen, setDrawerOpen] = useState(false)

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
      <div className="doctor-shell">
        <aside className={`doc-sidebar ${drawerOpen ? 'is-open' : ''}`}>
          <div className="doc-brand">
            <span className="doc-brand-mark">M</span>
            <div>
              <strong>MediCard</strong>
              <span>Doctor Portal</span>
            </div>
            <button type="button" className="doc-icon-btn doc-sidebar-close" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
              <CloseIcon size={18} />
            </button>
          </div>

          <nav className="doc-nav">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/doctor/dashboard'}
                className={({ isActive }) => (isActive ? 'is-active' : '')}
                onClick={() => setDrawerOpen(false)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {to === '/doctor/notifications' && unread > 0 && <em className="doc-nav-badge">{unread}</em>}
              </NavLink>
            ))}
          </nav>

          <button type="button" className="doc-logout" onClick={handleLogout}>
            <LogoutIcon size={18} />
            <span>Logout</span>
          </button>
        </aside>

        {drawerOpen && <div className="doc-scrim" onClick={() => setDrawerOpen(false)} />}

        <div className="doc-main">
          <header className="doc-topbar">
            <button type="button" className="doc-icon-btn doc-menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
              <MenuIcon size={20} />
            </button>
            <div className="doc-topbar-title">
              <strong>{name}</strong>
              <span>{meta || 'Doctor'}</span>
            </div>
            <div className="doc-topbar-actions">
              <NavLink to="/doctor/notifications" className="doc-icon-btn doc-bell" aria-label="Notifications">
                <BellIcon size={20} />
                {unread > 0 && <em>{unread > 9 ? '9+' : unread}</em>}
              </NavLink>
              <NavLink to="/doctor/profile" className="doc-user-chip">
                <span className="doc-avatar">{(name || 'D').slice(0, 1).toUpperCase()}</span>
                <span className="doc-user-name">{name}</span>
              </NavLink>
            </div>
          </header>

          <main className="doc-content">
            <Outlet context={{ profile, unread, setUnread }} />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}

export default DoctorLayout