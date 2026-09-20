import { Link } from 'react-router-dom'
import { RoleIcon, ChevronRightIcon } from './roleIcons'

function RoleCard({ config }) {
  return (
    <Link
      to={`/login/${config.key}`}
      className="authx-role"
      style={{ '--ax-role': config.color, '--ax-role-soft': config.soft }}
    >
      <span className="authx-role-icon" aria-hidden="true">
        <RoleIcon name={config.icon} size={28} color={config.color} />
      </span>
      <span className="authx-role-body">
        <span className="authx-role-title">{config.label}</span>
        {config.description && <span className="authx-role-desc">{config.description}</span>}
      </span>
      <span className="authx-role-go" aria-hidden="true">
        <ChevronRightIcon size={18} color={config.color} />
      </span>
    </Link>
  )
}

export default RoleCard
