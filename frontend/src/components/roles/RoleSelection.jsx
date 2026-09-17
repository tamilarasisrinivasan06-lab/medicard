import { Link } from 'react-router-dom'
import RoleCard from './RoleCard'
import { ROLE_ORDER, ROLES } from './roleConfig'

function RoleSelection() {
  return (
    <div className="role-page">
      <div className="medicard-brand">
        <span className="medicard-logo brand-logo" aria-hidden="true">
          M
        </span>
        <span className="medicard-brand-name">MediCard</span>
      </div>

      <h1 className="role-title">Login</h1>

      <div className="role-grid">
        {ROLE_ORDER.map((key) => (
          <RoleCard key={key} config={ROLES[key]} />
        ))}
      </div>

      <p className="role-footer-note">
        Staff login for pharmacists &amp; diagnostic staff?{' '}
        <Link to="/login/classic" className="role-link">
          Sign in here
        </Link>
      </p>
    </div>
  )
}

export default RoleSelection