import { Link, useOutletContext } from 'react-router-dom'
import { getPatientPortalDashboard } from '../../api'
import { Alert, EmptyState, useAsync, formatDate, formatTime } from '../../components/doctor/ui'
import {
  StethoscopeIcon,
  PillIcon,
  FlaskIcon,
  ScanIcon,
  FolderIcon,
  CalendarIcon,
  ClockIcon,
  QrIcon,
} from '../../components/doctor/icons'

const ACTIVITY_ICON = {
  consultation: StethoscopeIcon,
  prescription: PillIcon,
  lab_report: FlaskIcon,
  record: FolderIcon,
  appointment: CalendarIcon,
}

const ACTIVITY_TONE = {
  consultation: 'mc-tone-blue',
  prescription: 'mc-tone-green',
  lab_report: 'mc-tone-amber',
  record: 'mc-tone-purple',
  appointment: 'mc-tone-cyan',
}

const ACTIVITY_LABEL = {
  consultation: 'Consultation',
  prescription: 'Prescription',
  lab_report: 'Blood test',
  record: 'Medical record',
  appointment: 'Appointment',
}

const FEATURES = [
  { to: '/patient/history', label: 'Medical History', desc: 'Consultations and treatments', icon: ClockIcon, tone: 'mc-tone-blue' },
  { to: '/patient/scans', label: 'Scan Reports', desc: 'X-Ray, MRI, CT and more', icon: ScanIcon, tone: 'mc-tone-cyan' },
  { to: '/patient/prescriptions', label: 'Medicines', desc: 'Prescriptions and dosage', icon: PillIcon, tone: 'mc-tone-green' },
  { to: '/patient/appointments', label: 'Appointments', desc: 'Upcoming doctor visits', icon: CalendarIcon, tone: 'mc-tone-purple' },
]

function DashboardSkeleton() {
  return (
    <div className="mc-page">
      <div className="mc-skeleton" style={{ height: 26, width: 260 }} />
      <div className="mc-skeleton mc-skeleton-block" style={{ height: 200 }} />
      <div className="mc-features">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="mc-skeleton mc-skeleton-card" />
        ))}
      </div>
    </div>
  )
}

function Dashboard() {
  const { profile } = useOutletContext() || {}
  const { data, loading, error } = useAsync(() => getPatientPortalDashboard(), [])

  if (loading) return <DashboardSkeleton />
  if (error) return <Alert>{error}</Alert>
  if (!data) return null

  const name = data.patient?.name || profile?.name || 'there'
  const medicardId = data.medicard?.medicardId || data.patient?.medicardId
  const nextAppt = data.upcomingAppointments?.[0]
  const nextDate = nextAppt ? new Date(nextAppt.appointmentDate) : null

  return (
    <div className="mc-page">
      <header className="mc-welcome">
        <div>
          <h1>
            Hi, {name.split(' ')[0]} <span aria-hidden="true">👋</span>
          </h1>
          <p>Your health records in one place.</p>
        </div>
      </header>

      <section className="mc-hero">
        <div className="mc-hero-body">
          <span className="mc-hero-icon">
            <QrIcon size={26} />
          </span>
          <h2>My Medi Card</h2>
          <p>{name}</p>
          <span className="mc-code">{medicardId || '—'}</span>
        </div>
        <div className="mc-hero-qr">
          <div className="doc-qr-code">
            {data.medicard?.qrDataUrl ? <img src={data.medicard.qrDataUrl} alt="Medi Card QR code" /> : <QrIcon size={64} />}
          </div>
          <Link className="doc-btn mc-btn-light" to="/patient/medi-card">
            View My Card
          </Link>
        </div>
      </section>

      {/* AI Virtual Assistant Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
          margin: '1.5rem 0',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.2)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            ✨ NEW: AI Clinical Virtual Assistant
          </div>
          <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.2rem', fontWeight: 700 }}>Feeling Unwell or Need a Pre-Consultation Triage?</h3>
          <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.9 }}>
            Talk or speak with our AI Assistant to triage your symptoms and automatically send an SBAR summary to your doctor.
          </p>
        </div>
        <Link
          to="/patient/ai-assistant"
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            background: '#fff',
            color: '#0369a1',
            fontWeight: 700,
            fontSize: '0.9rem',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          Talk to AI Assistant →
        </Link>
      </section>

      <div className="mc-features">

        {FEATURES.map(({ to, label, desc, icon: Icon, tone }) => (
          <Link key={to} to={to} className="mc-feature">
            <span className={`mc-feature-icon ${tone}`}>
              <Icon size={22} />
            </span>
            <strong>{label}</strong>
            <span>{desc}</span>
            <em>View →</em>
          </Link>
        ))}
      </div>

      <div className="doc-grid doc-grid-2">
        <section className="doc-card">
          <div className="mc-section-head">
            <h2>Recent Activity</h2>
            <Link to="/patient/history">View all</Link>
          </div>
          {data.recentActivity?.length ? (
            <div>
              {data.recentActivity.slice(0, 4).map((item) => {
                const Icon = ACTIVITY_ICON[item.type] || FolderIcon
                return (
                  <div className="mc-appt" key={`${item.type}-${item.id}`}>
                    <span className={`mc-inline-icon ${ACTIVITY_TONE[item.type] || 'mc-tone-blue'}`}>
                      <Icon size={18} />
                    </span>
                    <div className="mc-appt-main">
                      <strong>{item.title}</strong>
                      <span>
                        {ACTIVITY_LABEL[item.type] || 'Record'}
                        {item.doctorName ? ` · ${item.doctorName}` : ''}
                      </span>
                    </div>
                    <span className="doc-muted" style={{ fontSize: 12.5 }}>
                      {formatDate(item.date)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={<FolderIcon size={26} />} title="No records yet." message="Your medical activity will show up here." />
          )}
        </section>

        <section className="doc-card">
          <div className="mc-section-head">
            <h2>Next Appointment</h2>
            <Link to="/patient/appointments">Book</Link>
          </div>
          {nextAppt ? (
            <div className="mc-next">
              {nextDate && !Number.isNaN(nextDate.getTime()) && (
                <div className="mc-next-date">
                  <strong>{nextDate.getDate()}</strong>
                  <span>{nextDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                </div>
              )}
              <div className="mc-appt-main">
                <strong>{nextAppt.doctorName || nextAppt.reason || 'Appointment'}</strong>
                <span>
                  {formatDate(nextAppt.appointmentDate)}
                  {nextAppt.appointmentTime ? ` · ${formatTime(nextAppt.appointmentTime)}` : ''}
                  {nextAppt.hospitalName ? ` · ${nextAppt.hospitalName}` : ''}
                </span>
              </div>
              <Link className="doc-btn doc-btn-sm doc-btn-ghost" to="/patient/appointments">
                View
              </Link>
            </div>
          ) : (
            <EmptyState
              icon={<CalendarIcon size={26} />}
              title="No upcoming visits"
              message="Book a consultation when you need one."
              action={
                <Link className="doc-btn doc-btn-sm" to="/patient/appointments">
                  Book Appointment
                </Link>
              }
            />
          )}

          {data.upcomingFollowUp && (
            <div className="doc-callout">
              <div>
                <strong>Follow-up scheduled</strong>
                <p className="doc-muted">
                  {formatDate(data.upcomingFollowUp.followUpDate)}
                  {data.upcomingFollowUp.doctorName ? ` · ${data.upcomingFollowUp.doctorName}` : ''}
                </p>
              </div>
              <ClockIcon size={18} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Dashboard
