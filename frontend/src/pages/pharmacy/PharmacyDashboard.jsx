import { Link } from 'react-router-dom'
import { getPharmacyDashboard } from '../../api'
import { useAsync, Card, StatCard, Alert, EmptyState, StatusBadge, formatDate } from '../../components/doctor/ui'
import { PillIcon, CheckIcon, ClockIcon, ReportIcon, StoreIcon } from '../../components/doctor/icons'

function PharmacyDashboard() {
  const { data, loading, error } = useAsync(() => getPharmacyDashboard(), [])

  return (
    <div className="mc-page">
      <header className="mc-welcome">
        <div>
          <h1>Pharmacy Dashboard</h1>
          <p>Prescriptions routed to your hospital pharmacy.</p>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}

      <section className="mc-hero">
        <div className="mc-hero-body">
          <span className="mc-hero-icon">
            <PillIcon size={26} />
          </span>
          <h2>Dispense Prescriptions</h2>
          <p>Review pending prescriptions and dispense medicines.</p>
        </div>
        <div className="mc-hero-actions">
          <Link className="doc-btn mc-btn-light" to="/pharmacy/queue">
            <StoreIcon size={17} /> Open Queue
          </Link>
          <Link className="doc-btn mc-btn-outline" to="/pharmacy/dispensed">
            <CheckIcon size={17} /> Dispensed
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
          <StatCard icon={<ClockIcon size={20} />} label="Pending prescriptions" value={data?.pending} tone="amber" />
          <StatCard icon={<CheckIcon size={20} />} label="Dispensed today" value={data?.dispensedToday} tone="green" />
          <StatCard icon={<PillIcon size={20} />} label="All prescriptions" value={data?.total} />
          <StatCard icon={<ReportIcon size={20} />} label="Dispensed (total)" value={data?.dispensedTotal} />
        </div>
      )}

      <Card
        title="Recent Prescriptions"
        actions={
          <Link className="doc-link" to="/pharmacy/queue">
            View all
          </Link>
        }
      >
        {(data?.recentPrescriptions || []).length === 0 ? (
          <EmptyState icon={<PillIcon size={26} />} title="No prescriptions yet" message="Prescriptions from your hospital doctors will appear here." />
        ) : (
          <div>
            {(data.recentPrescriptions || []).slice(0, 6).map((p) => (
              <div className="mc-appt" key={p.id}>
                <span className="mc-inline-icon mc-tone-blue">
                  <PillIcon size={18} />
                </span>
                <div className="mc-appt-main">
                  <strong>{p.patientName || `Patient #${p.patientId}`}</strong>
                  <span>
                    {p.doctorName || 'Doctor'} · {formatDate(p.prescriptionDate)} · {p.itemCount ?? 0} item{(p.itemCount ?? 0) === 1 ? '' : 's'}
                  </span>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default PharmacyDashboard
