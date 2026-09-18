import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getMe, getRole, getToken, logout, dashboardForRole } from '../../api'
import {
  DashboardIcon,
  PatientsIcon,
  BuildingIcon,
  StethoscopeIcon,
  StoreIcon,
  FlaskIcon,
  UserCheckIcon,
  ShieldIcon,
  PillIcon,
  ReportIcon,
  CheckIcon,
} from '../doctor/icons'
import { ToastProvider } from '../doctor/ui'
import AppShell from '../layout/AppShell'
import '../doctor/doctor.css'

const BASE = {
  pharmacist: '/pharmacy',
  diagnostic_staff: '/lab',
  hospital: '/hospital',
  super_admin: '/super-admin',
}

const ALLOWED = {
  pharmacy: ['pharmacist'],
  lab: ['diagnostic_staff'],
  hospital: ['hospital'],
  super_admin: ['super_admin'],
}

function portalConfig(role) {
  const base = BASE[role]
  if (!base) return null

  switch (role) {
    case 'pharmacist':
      return {
        title: 'Pharmacy Portal',
        subtitle: 'Prescription dispensing',
        primary: [
          { to: `${base}/dashboard`, label: 'Dashboard', icon: DashboardIcon },
          { to: `${base}/queue`, label: 'Prescription Queue', icon: PillIcon },
          { to: `${base}/dispensed`, label: 'Dispensed', icon: CheckIcon },
        ],
        more: [],
      }
    case 'diagnostic_staff':
      return {
        title: 'Diagnostic Lab Portal',
        subtitle: 'Test processing',
        primary: [
          { to: `${base}/dashboard`, label: 'Dashboard', icon: DashboardIcon },
          { to: `${base}/queue`, label: 'Test Queue', icon: FlaskIcon },
          { to: `${base}/reports`, label: 'Reports', icon: ReportIcon },
        ],
        more: [],
      }
    case 'super_admin':
      return {
        title: 'Super Admin Portal',
        subtitle: 'Platform-wide control',
        primary: [
          { to: `${base}/dashboard`, label: 'Dashboard', icon: DashboardIcon },
          { to: `${base}/doctors`, label: 'Doctors', icon: StethoscopeIcon },
          { to: `${base}/patients`, label: 'Patients', icon: PatientsIcon },
          { to: `${base}/pharmacies`, label: 'Pharmacies', icon: StoreIcon },
          { to: `${base}/lab-technicians`, label: 'Lab Technicians', icon: FlaskIcon },
          { to: `${base}/users`, label: 'Users', icon: UserCheckIcon },
        ],
        more: [{ to: `${base}/activity`, label: 'Activity Log', icon: ShieldIcon }],
        profileTo: `${base}/profile`,
      }
    case 'hospital':
      return {
        title: 'Hospital Portal',
        subtitle: 'Hospital operations',
        primary: [
          { to: `${base}/dashboard`, label: 'Dashboard', icon: DashboardIcon },
          { to: `${base}/users`, label: 'Staff & Users', icon: PatientsIcon },
          { to: `${base}/hospitals`, label: 'Hospital Profile', icon: BuildingIcon },
        ],
        more: [{ to: `${base}/activity`, label: 'Activity Log', icon: ShieldIcon }],
      }
    default:
      return null
  }
}

function PortalLayout({ portalKey }) {
  const navigate = useNavigate()
  const role = getRole()
  const hasToken = Boolean(getToken())
  const [me, setMe] = useState(null)

  const allowed = ALLOWED[portalKey] || []
  const permitted = hasToken && allowed.includes(role)
  const config = permitted ? portalConfig(role) : null

  useEffect(() => {
    if (!permitted) return
    let active = true
    getMe()
      .then((res) => {
        if (active && res.success) setMe(res.data?.user || res.data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [permitted])

  if (!hasToken) return <Navigate to="/login" replace />
  if (!permitted || !config) return <Navigate to={dashboardForRole(role)} replace />

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const name = me?.name || me?.fullName || 'Staff'
  const meta = me?.hospitalName || config.title

  return (
    <ToastProvider>
      <AppShell
        portalLabel={config.title}
        title={config.title}
        subtitle={config.subtitle}
        primary={config.primary}
        more={config.more}
        user={{ name, meta }}
        profileTo={config.profileTo}
        profileMenu={config.more}
        onLogout={handleLogout}
        context={{ me }}
      />
    </ToastProvider>
  )
}

export default PortalLayout
