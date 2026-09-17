import { Link } from 'react-router-dom'
import { RoleIcon } from './roleIcons'

function RoleCard({ config }) {
  return (
    <Link to={`/login/${config.key}`} className="role-card">
      <span className="role-card-icon" style={{ backgroundColor: config.color }} aria-hidden="true">
        <RoleIcon name={config.icon} size={30} />
      </span>
      <span className="role-card-title">{config.label}</span>
    </Link>
  )
}

export default RoleCard