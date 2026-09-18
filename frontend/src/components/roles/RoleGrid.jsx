import RoleCard from './RoleCard'

function RoleGrid({ roles }) {
  return (
    <div className="authx-roles">
      {roles.map((config) => (
        <RoleCard key={config.key} config={config} />
      ))}
    </div>
  )
}

export default RoleGrid
