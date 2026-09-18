import { Link } from 'react-router-dom'
import PageContainer from './PageContainer'
import BrandHeader from './BrandHeader'
import RoleGrid from './RoleGrid'
import StaffLogin from './StaffLogin'
import { RoleIcon, ChevronRightIcon } from './roleIcons'
import { ROLES, PRIMARY_ROLE_KEYS, SECONDARY_ROLE_KEYS } from './roleConfig'

function RoleSelection() {
  const primaryRoles = PRIMARY_ROLE_KEYS.map((key) => ROLES[key]).filter(Boolean)
  const secondaryRoles = SECONDARY_ROLE_KEYS.map((key) => ROLES[key]).filter(Boolean)

  return (
    <PageContainer>
      <BrandHeader />

      <div className="authx-hero">
        <h1>Welcome to MediCard</h1>
        <p>Choose your portal to continue</p>
      </div>

      <RoleGrid roles={primaryRoles} />

      {secondaryRoles.length > 0 && (
        <section className="authx-section">
          <div className="authx-divider">
            <span>Advanced Access</span>
          </div>
          {secondaryRoles.map((config) => (
            <Link
              key={config.key}
              to={`/login/${config.key}`}
              className="authx-admin"
              style={{ '--ax-role': config.color, '--ax-role-soft': config.soft }}
            >
              <span className="authx-role-icon" aria-hidden="true">
                <RoleIcon name={config.icon} size={22} />
              </span>
              <span className="authx-admin-main">
                <strong>{config.label}</strong>
                <span>{config.description}</span>
              </span>
              <ChevronRightIcon size={18} className="authx-admin-go" />
            </Link>
          ))}
        </section>
      )}

      <StaffLogin />
    </PageContainer>
  )
}

export default RoleSelection
