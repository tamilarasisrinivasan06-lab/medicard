import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getToken, getRole, getMe, logout, dashboardForRole } from '../../api'
import { RoleIcon, LogoutIcon } from './roleIcons'
import { ROLES } from './roleConfig'

const ALLOWED = ['hospital', 'admin', 'super_admin']

function RolePortal() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const role = getRole()

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const result = await getMe()
        if (active && result.success) {
          setName(result.data?.name || '')
        }
      } catch {
        // ignore
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  if (!getToken()) {
    return <Navigate to="/login" replace />
  }

  if (!ALLOWED.includes(role)) {
    return <Navigate to={dashboardForRole(role)} replace />
  }

  const config = ROLES[role]

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="portal-view">
      <header className="portal-nav">
        <span className="medicard-logo" aria-hidden="true">
          M
        </span>
        <span className="portal-nav-title">MediCard Portal</span>
        <nav className="portal-nav-links">
          {role === 'hospital' && <Link to="/scan">Scan a MediCard</Link>}
        </nav>
        <button type="button" className="nav-logout" onClick={handleLogout}>
          <LogoutIcon size={16} /> Logout
        </button>
      </header>

      <section className="portal-hero">
        <span className="role-card-icon portal-role-icon" style={{ backgroundColor: config.color }}>
          <RoleIcon name={config.icon} size={30} />
        </span>
        <h1>{name || config.label} Portal</h1>
        <p>
          Signed in as {config.label}. This area manages {config.role === 'super_admin' ? 'the complete MediCard platform' : config.role === 'admin' ? 'users, hospitals and system settings' : 'hospital and department operations'}.
        </p>
        <button type="button" className="portal-hero-action" onClick={handleLogout}>
          <LogoutIcon size={18} /> Sign out
        </button>
      </section>
    </div>
  )
}

export default RolePortal