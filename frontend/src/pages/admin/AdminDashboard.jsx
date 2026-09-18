import { Link } from 'react-router-dom'
import { getAdminDashboard, getRole } from '../../api'
import { useAsync, Card, StatCard, Alert, EmptyState, formatDateTime } from '../../components/doctor/ui'
import { PatientsIcon, UserCheckIcon, CalendarIcon, PillIcon, ShieldIcon } from '../../components/doctor/icons'

function activityPath(role) {
  if (role === 'hospital') return '/hospital/activity'
  if (role === 'super_admin') return '/super-admin/activity'
  return '/admin/activity'
}

function AdminDashboard() {
  const role = getRole()
  const { data, loading, error } = useAsync(() => getAdminDashboard(), [])
  const stats = data?.stats
  const isPlatform = role === 'admin' || role === 'super_admin'

  return (
    <div className="mc-page">
      <header className="mc-welcome">
        <div>
          <h1>{data?.scope === 'hospital' ? 'Hospital Overview' : 'Platform Overview'}</h1>
          <p>{isPlatform ? 'Users, hospitals and activity across MediCard.' : 'Your hospital at a glance.'}</p>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div className="doc-stats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="mc-skeleton mc-skeleton-stat" />
          ))}
        </div>
      ) : (
        <div className="doc-stats">
          <StatCard icon={<PatientsIcon size={20} />} label="Users" value={stats?.users} />
          <StatCard icon={<UserCheckIcon size={20} />} label="Doctors" value={stats?.doctors} tone="green" />
          <StatCard icon={<CalendarIcon size={20} />} label="Appointments" value={stats?.appointments} tone="accent" />
          <StatCard icon={<PillIcon size={20} />} label="Pending prescriptions" value={stats?.pendingPrescriptions} tone="amber" />
        </div>
      )}

      <div className="doc-grid doc-grid-2">
        <Card
          title="Recently Registered"
          actions={
            <Link className="doc-link" to={isPlatform ? '/admin/users' : '/hospital/users'}>
              View all
            </Link>
          }
        >
          {(data?.recentUsers || []).length === 0 ? (
            <EmptyState icon={<PatientsIcon size={24} />} title="No users yet" />
          ) : (
            <div>
              {(data.recentUsers || []).slice(0, 5).map((u) => (
                <div className="mc-appt" key={u.id}>
                  <span className="mc-inline-icon mc-tone-blue">
                    <PatientsIcon size={18} />
                  </span>
                  <div className="mc-appt-main">
                    <strong>{u.name}</strong>
                    <span>{u.email}</span>
                  </div>
                  <span className="doc-badge">{String(u.role || '').replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Recent Activity"
          actions={
            <Link className="doc-link" to={activityPath(role)}>
              View all
            </Link>
          }
        >
          {(data?.recentActivity || []).length === 0 ? (
            <EmptyState icon={<ShieldIcon size={24} />} title="No activity yet" />
          ) : (
            <div>
              {(data.recentActivity || []).slice(0, 5).map((a) => (
                <div className="mc-appt" key={a.id}>
                  <span className="mc-inline-icon mc-tone-purple">
                    <ShieldIcon size={18} />
                  </span>
                  <div className="mc-appt-main">
                    <strong>{String(a.action || '').replace(/_/g, ' ')}</strong>
                    <span>{a.userName}</span>
                  </div>
                  <span className="doc-muted" style={{ fontSize: 12.5 }}>
                    {formatDateTime(a.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboard
