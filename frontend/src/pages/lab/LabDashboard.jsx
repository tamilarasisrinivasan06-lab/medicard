import { Link } from 'react-router-dom'
import { getLabDashboard } from '../../api'
import { useAsync, Card, StatCard, Alert, EmptyState, StatusBadge, formatDate } from '../../components/doctor/ui'
import { FlaskIcon, ClockIcon, CheckIcon, ReportIcon, DropletIcon } from '../../components/doctor/icons'

function LabDashboard() {
  const { data, loading, error } = useAsync(() => getLabDashboard(), [])

  return (
    <div className="mc-page">
      <header className="mc-welcome">
        <div>
          <h1>Diagnostic Lab Dashboard</h1>
          <p>Lab test requests for your hospital.</p>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      <section className="mc-hero">
        <div className="mc-hero-body">
          <span className="mc-hero-icon">
            <FlaskIcon size={26} />
          </span>
          <h2>Process Test Requests</h2>
          <p>Pick up pending tests and publish reports.</p>
        </div>
        <div className="mc-hero-actions">
          <Link className="doc-btn mc-btn-light" to="/lab/queue">
            <DropletIcon size={17} /> Open Queue
          </Link>
          <Link className="doc-btn mc-btn-outline" to="/lab/reports">
            <ReportIcon size={17} /> Reports
          </Link>
        </div>
      </section>

      {loading ? (
        <div className="doc-stats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="mc-skeleton mc-skeleton-stat" />
          ))}
        </div>
      ) : (
        <div className="doc-stats">
          <StatCard icon={<ClockIcon size={20} />} label="Requested" value={data?.requested} tone="amber" />
          <StatCard icon={<FlaskIcon size={20} />} label="In progress" value={data?.inProgress} />
          <StatCard icon={<CheckIcon size={20} />} label="Ready" value={data?.ready} tone="green" />
          <StatCard icon={<ReportIcon size={20} />} label="Reports today" value={data?.reportsToday} />
        </div>
      )}

      <Card
        title="Recent Requests"
        actions={
          <Link className="doc-link" to="/lab/queue">
            View all
          </Link>
        }
      >
        {(data?.recentRequests || []).length === 0 ? (
          <EmptyState icon={<FlaskIcon size={26} />} title="No lab requests" message="Requests ordered by doctors will appear here." />
        ) : (
          <div>
            {(data.recentRequests || []).slice(0, 6).map((r) => (
              <div className="mc-appt" key={r.id}>
                <span className="mc-inline-icon mc-tone-amber">
                  <FlaskIcon size={18} />
                </span>
                <div className="mc-appt-main">
                  <strong>{r.title}</strong>
                  <span>
                    {r.patientName || `Patient #${r.patientId}`} · {formatDate(r.requestedAt)}
                  </span>
                </div>
                <StatusBadge status={r.priority} />
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default LabDashboard
