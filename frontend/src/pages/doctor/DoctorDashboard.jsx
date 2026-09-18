import { useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { getDoctorDashboard, getAccessRequests, getDoctorAppointments } from '../../api'
import { Card, StatCard, Alert, EmptyState, StatusBadge, useAsync, formatTime, formatDate } from '../../components/doctor/ui'
import {
  PatientsIcon,
  CalendarIcon,
  InboxIcon,
  RepeatIcon,
  ScanIcon,
  PlusIcon,
  QrIcon,
  ClockIcon,
} from '../../components/doctor/icons'

function isoDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function DashboardSkeleton() {
  return (
    <div className="mc-page">
      <div className="mc-skeleton" style={{ height: 26, width: 280 }} />
      <div className="mc-skeleton mc-skeleton-block" style={{ height: 180 }} />
      <div className="doc-stats">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="mc-skeleton mc-skeleton-stat" />
        ))}
      </div>
      <div className="doc-grid doc-grid-2">
        <div className="mc-skeleton mc-skeleton-block" />
        <div className="mc-skeleton mc-skeleton-block" />
      </div>
    </div>
  )
}

function DoctorDashboard() {
  const { profile } = useOutletContext() || {}
  const dashboard = useAsync(() => getDoctorDashboard('today'), [])
  const appointments = useAsync(() => getDoctorAppointments(), [])
  const pendingRequests = useAsync(() => getAccessRequests('pending'), [])

  const todayAppointments = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return (appointments.data || [])
      .filter((a) => isoDate(a.appointmentDate) === today && a.status !== 'cancelled')
      .sort((a, b) => String(a.appointmentTime || '').localeCompare(String(b.appointmentTime || '')))
  }, [appointments.data])

  if (dashboard.loading) return <DashboardSkeleton />

  const d = dashboard.data || {}
  const requests = pendingRequests.data || []
  const name = profile?.name || 'Doctor'
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="mc-page">
      <header className="mc-welcome">
        <div>
          <h1>
            Welcome back, {name} <span aria-hidden="true">👋</span>
          </h1>
          <p>Manage your patients and consultations.</p>
        </div>
      </header>

      {dashboard.error && <Alert>{dashboard.error}</Alert>}

      <section className="mc-hero">
        <div className="mc-hero-body">
          <span className="mc-hero-icon">
            <ScanIcon size={26} />
          </span>
          <h2>Scan Patient Card</h2>
          <p>Scan or enter a patient's MediCard ID to securely access their records.</p>
        </div>
        <div className="mc-hero-actions">
          <Link className="doc-btn mc-btn-light" to="/doctor/scan">
            <QrIcon size={17} /> Scan Patient Card
          </Link>
          <Link className="doc-btn mc-btn-outline" to="/doctor/scan">
            <PlusIcon size={17} /> Enter Patient ID
          </Link>
        </div>
      </section>

      <div className="doc-stats">
        <StatCard icon={<PatientsIcon size={20} />} label="Today's Patients" value={d.patientsToday} tone="accent" />
        <StatCard icon={<CalendarIcon size={20} />} label="Appointments" value={d.todayAppointments} tone="green" />
        <StatCard icon={<InboxIcon size={20} />} label="Pending Requests" value={d.pendingAccessRequests} tone="amber" />
        <StatCard icon={<RepeatIcon size={20} />} label="Follow-ups" value={d.followUpsDue} tone="red" />
      </div>

      <div className="doc-grid doc-grid-2">
        <Card
          title="Today's Appointments"
          actions={
            <Link className="doc-link" to="/doctor/appointments">
              View all
            </Link>
          }
        >
          {appointments.loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="mc-skeleton" style={{ height: 44 }} />
              ))}
            </div>
          ) : todayAppointments.length > 0 ? (
            <div>
              {todayAppointments.slice(0, 5).map((a) => (
                <div className="mc-appt" key={a.id}>
                  <span className="mc-appt-time">{a.appointmentTime ? formatTime(a.appointmentTime) : formatDate(a.appointmentDate)}</span>
                  <div className="mc-appt-main">
                    <strong>{a.patientName || `Patient #${a.patientId}`}</strong>
                    <span>{a.reason || 'General Consultation'}</span>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<CalendarIcon size={26} />} title="No appointments today" message="Enjoy the calm — nothing scheduled." />
          )}
        </Card>

        <Card
          title="Patient Requests"
          actions={
            <Link className="doc-link" to="/doctor/access-requests">
              View all
            </Link>
          }
        >
          {pendingRequests.loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="mc-skeleton" style={{ height: 44 }} />
              ))}
            </div>
          ) : requests.length > 0 ? (
            <div>
              {requests.slice(0, 5).map((r) => (
                <div className="mc-appt" key={r.id}>
                  <span className="mc-inline-icon mc-tone-amber">
                    <InboxIcon size={18} />
                  </span>
                  <div className="mc-appt-main">
                    <strong>{r.patientName || 'Patient'}</strong>
                    <span>{r.medicardId || 'MediCard'}</span>
                  </div>
                  <Link className="doc-btn doc-btn-sm doc-btn-ghost" to="/doctor/access-requests">
                    View
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<InboxIcon size={26} />}
              title="No pending requests"
              message="New access requests will appear here."
              action={
                <Link className="doc-btn doc-btn-sm" to="/doctor/scan">
                  <PlusIcon size={15} /> Request access
                </Link>
              }
            />
          )}
        </Card>
      </div>

      <p className="doc-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
        <ClockIcon size={15} /> {greeting} — detailed statistics live in{' '}
        <Link to="/doctor/analytics">Analytics</Link>.
      </p>
    </div>
  )
}

export default DoctorDashboard
