import { Navigate, useParams, Link } from 'react-router-dom'
import LoginForm from './LoginForm'
import { RoleIcon } from './roleIcons'
import { roleConfigForSlug } from './roleConfig'

function RoleLogin() {
  const { role } = useParams()
  const config = roleConfigForSlug(role)

  if (!config) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="role-page">
      <div className="medicard-brand">
        <span className="medicard-logo brand-logo" aria-hidden="true">
          M
        </span>
        <span className="medicard-brand-name">MediCard</span>
      </div>

      <span className="role-login-icon" style={{ backgroundColor: config.color }} aria-hidden="true">
        <RoleIcon name={config.icon} size={34} />
      </span>

      <h1 className="role-title">{config.label} Login</h1>

      <LoginForm config={config} />

      <p className="role-footer-note">
        New to MediCard?{' '}
        <Link to="/register" className="role-link">
          Create a patient account
        </Link>
      </p>
    </div>
  )
}

export default RoleLogin