import { Link, useOutletContext } from 'react-router-dom'
import { getSuperAdminDashboard } from '../../api'
import { useAsync, Card, StatCard, Alert, EmptyState, formatDate } from '../../components/doctor/ui'
import {
  StethoscopeIcon,
  PatientsIcon,
  StoreIcon,
  FlaskIcon,
  UserCheckIcon,
  ShieldIcon,
  UserIcon,
} from '../../components/doctor/icons'

function SuperAdminDashboard() {
  const { me } = useOutletContext() || {}
  const { data, loading, error } = useAsync(() => getSuperAdminDashboard(), [])
  const stats = data?.stats

  return (
    <div className="mc-page">
      <header className="mc-welcome">
        <div>
          <h1>Super Admin Dashboard</h1>
          {me?.name && <p>Welcome back, {me.name}. Platform-wide control of doctors, patients, pharmacies and lab technicians.</p>}
          {!me?.name && <p>Platform-wide control of doctors, patients, pharmacies and lab technicians.</p>}
        </div>
        <span className="doc-badge doc-badge-active">Super Admin</span>
      </header>

      {error && <Alert>{error}</Alert>}

      <section className="mc-hero">
        <div className="mc-hero-body">
          <span className="mc-hero-icon">
            <ShieldIcon size={26} />
          </span>
          <h2>Administrative Overview</h2>
          <p>Monitor platform growth and manage registered accounts.</p>
        </div>
        <div className="mc-hero-actions">
          <Link className="doc-btn mc-btn-light" to="/super-admin/doctors">
            <StethoscopeIcon size={17} /> Doctors
          </Link>
          <Link className="doc-btn mc-btn-outline" to="/super-admin/users">
            <UserCheckIcon size={17} /> All Users
          </Link>
        </div>
      </section>

      {loading ? (
        <div className="doc-stats">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="mc-skeleton mc-skeleton-stat" />
          ))}
        </div>
      ) : (
        <div className="doc-stats">
          <StatCard icon={<UserCheckIcon size={20} />} label="Registered users" value={stats?.users} />
          <StatCard icon={<StethoscopeIcon size={20} />} label="Doctors" value={stats?.doctors} tone="green" />
          <StatCard icon={<PatientsIcon size={20} />} label="Patients" value={stats?.patients} tone="accent" />
          <StatCard icon={<StoreIcon size={20} />} label="Pharmacies" value={stats?.pharmacies} tone="amber" />
          <StatCard icon={<FlaskIcon size={20} />} label="Lab technicians" value={stats?.labTechnicians} tone="red" />
        </div>
      )}

      <div className="doc-grid doc-grid-2">
        <Card
          title="Recent Registrations"
          actions={
            <Link className="doc-link" to="/super-admin/users">
              View all
            </Link>
          }
        >
          {(data?.recentUsers || []).length === 0 ? (
            <EmptyState icon={<UserIcon size={26} />} title="No registrations yet" />
          ) : (
            <div>
              {(data.recentUsers || []).slice(0, 6).map((u) => (
                <div className="mc-appt" key={u.id}>
                  <span className="mc-inline-icon mc-tone-blue">
                    <UserIcon size={18} />
                  </span>
                  <div className="mc-appt-main">
                    <strong>{u.name}</strong>
                    <span>{u.email}</span>
                  </div>
                  <div className="mc-appt-side">
                    <span className="doc-badge">{String(u.role || '').replace(/_/g, ' ')}</span>
                    <span className="doc-muted" style={{ fontSize: 12 }}>{formatDate(u.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Recent Activity"
          actions={
            <Link className="doc-link" to="/super-admin/activity">
              View all
            </Link>
          }
        >
          {(data?.recentActivity || []).length === 0 ? (
            <EmptyState icon={<ShieldIcon size={26} />} title="No activity yet" />
          ) : (
            <div>
              {(data.recentActivity || []).slice(0, 6).map((a) => (
                <div className="mc-appt" key={a.id}>
                  <span className="mc-inline-icon mc-tone-purple">
                    <ShieldIcon size={18} />
                  </span>
                  <div className="mc-appt-main">
                    <strong>{String(a.action || '').replace(/_/g, ' ')}</strong>
                    <span>{a.userName}</span>
                  </div>
                  <span className="doc-muted" style={{ fontSize: 12.5 }}>
                    {formatDate(a.createdAt)}
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

export default SuperAdminDashboard