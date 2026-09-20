import { Navigate, useParams, Link, useSearchParams } from 'react-router-dom'
import PageContainer from './PageContainer'
import BrandHeader from './BrandHeader'
import LoginForm from './LoginForm'
import { RoleIcon, ArrowLeftIcon } from './roleIcons'
import { roleConfigForSlug } from './roleConfig'

const REGISTERABLE_ROLES = ['patient', 'doctor', 'pharmacist', 'diagnostic_staff']

function loginSubtitle(config) {
  if (config.role === 'super_admin') return 'Login to Super Admin'
  return `Login to your ${config.label} account`
}

function RoleLogin() {
  const { role } = useParams()
  const [searchParams] = useSearchParams()
  const config = roleConfigForSlug(role)
  const created = searchParams.get('created') === '1'

  if (!config) {
    return <Navigate to="/login" replace />
  }

  const canRegister = REGISTERABLE_ROLES.includes(config.role)

  return (
    <PageContainer narrow>
      <Link to="/login" className="authx-back">
        <ArrowLeftIcon size={16} /> All portals
      </Link>

      <BrandHeader />

      {created && (
        <p className="authx-success" role="status">
          Your {config.label} account was created successfully. Please sign in.
        </p>
      )}

      <div className="authx-card">
        <div className="authx-login-head">
          <span
            className="authx-login-icon"
            style={{ background: config.soft, color: config.color }}
            aria-hidden="true"
          >
            <RoleIcon name={config.icon} size={30} color={config.color} />
          </span>
          <div>
            <h1>{config.label} Login</h1>
            <p>{loginSubtitle(config)}</p>
          </div>
        </div>

        <LoginForm config={config} />
      </div>

      {canRegister && (
        <p className="authx-note">
          New to MediCard?{' '}
          <Link to={`/register/${config.key}`}>Create a {config.label.toLowerCase()} account</Link>
        </p>
      )}
    </PageContainer>
  )
}

export default RoleLogin