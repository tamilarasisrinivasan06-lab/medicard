import { Link } from 'react-router-dom'
import { ChevronRightIcon } from './roleIcons'

function StaffLogin() {
  return (
    <section className="authx-section authx-staff">
      <div className="authx-divider">
        <span>Staff Access</span>
      </div>
      <div className="authx-staff-card">
        <span className="authx-staff-main">
          <strong>Pharmacy &amp; Diagnostic Lab staff</strong>
          <span>Sign in to your staff portal</span>
        </span>
        <Link to="/login/classic" className="authx-staff-btn">
          Staff Login
          <ChevronRightIcon size={16} />
        </Link>
      </div>
    </section>
  )
}

export default StaffLogin
