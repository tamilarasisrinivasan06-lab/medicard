import { Link, useOutletContext } from 'react-router-dom'
import { getDoctorDashboard, getAccessRequests } from '../../api'
import { useAsync, StatCard, Card, Loading, Alert, EmptyState, StatusBadge, formatDate, formatDateTime } from '../../components/doctor/ui'
import {
  PatientsIcon,
  StethoscopeIcon,
  CalendarIcon,
  FlaskIcon,
  RepeatIcon,
  BellIcon,
  ChartIcon,
  InboxIcon,
  ScanIcon,
  PlusIcon,
} from '../../components/doctor/icons'

function DoctorDashboard() {
  const { profile } = useOutletContext()
  const dashboard = useAsync(() => getDoctorDashboard(), [])
  const pendingRequests = useAsync(() => getAccessRequests('pending'), [])

  if (dashboard.loading) return <Loading label="Loading your dashboard…" />

  const d = dashboard.data || {}
  const requests = pendingRequests.data || []

  return (
    <>
      <div className="doc-page-head">
        <div>
          <h1>Welcome back, {profile?.name || 'Doctor'}</h1>
          <p>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="doc-page-actions">
          <Link className="doc-btn doc-btn-ghost" to="/doctor/scan">
            <ScanIcon size={16} /> Scan Patient Card
          </Link>
          <Link className="doc-btn" to="/doctor/patients">
            <PatientsIcon size={16} /> My Patients
          </Link>
        </div>
      </div>

      {dashboard.error && <Alert>{dashboard.error}</Alert>}

      <div className="doc-stats">
        <StatCard icon={<PatientsIcon size={22} />} label="Authorized Patients" value={d.authorizedPatients} hint="Active patient consent" />
        <StatCard icon={<CalendarIcon size={22} />} label="Appointments Today" value={d.todayAppointments} tone="green" hint={`${d.upcomingAppointments ?? 0} upcoming`} />
        <StatCard icon={<StethoscopeIcon size={22} />} label="Consultations Today" value={d.todayConsultations} tone="accent" hint={`${d.monthConsultations ?? 0} this month`} />
        <StatCard icon={<StethoscopeIcon size={22} />} label="Total Consultations" value={d.totalConsultations} hint="All time" />
        <StatCard icon={<FlaskIcon size={22} />} label="Pending Lab Requests" value={d.pendingLabRequests} tone="amber" hint="Awaiting results" />
        <StatCard icon={<RepeatIcon size={22} />} label="Follow-ups Due" value={d.followUpsDue} tone="amber" hint="On or before today" />
        <StatCard icon={<BellIcon size={22} />} label="Unread Notifications" value={d.unreadNotifications} tone="red" />
        <StatCard icon={<ChartIcon size={22} />} label="This Month" value={d.monthConsultations} tone="green" hint="Consultations" />
      </div>

      <div className="doc-grid doc-grid-2">
        <Card
          title="Recent Consultations"
          subtitle="Your latest patient encounters"
          actions={
            <Link className="doc-btn doc-btn-ghost doc-btn-sm" to="/doctor/consultations">
              View all
            </Link>
          }
        >
          {d.recentConsultations && d.recentConsultations.length > 0 ? (
            <div className="doc-timeline">
              {d.recentConsultations.map((c) => (
                <div className="doc-timeline-item" key={c.id}>
                  <span className="doc-timeline-dot">
                    <StethoscopeIcon size={16} />
                  </span>
                  <div className="doc-timeline-body">
                    <div className="doc-timeline-head">
                      <strong>{c.patientName || `Patient #${c.patientId}`}</strong>
                      <StatusBadge status={c.status} />
                      <span className="doc-timeline-date">{formatDate(c.consultationDate)}</span>
                    </div>
                    <p>{c.title}</p>
                    {c.diagnosis && <p className="doc-muted">Diagnosis: {c.diagnosis}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<StethoscopeIcon size={26} />}
              title="No consultations yet"
              message="Consultations you record for your patients will appear here."
            />
          )}
        </Card>

        <Card
          title="Patient Access Requests"
          subtitle="Awaiting patient approval"
          actions={
            <Link className="doc-btn doc-btn-ghost doc-btn-sm" to="/doctor/access-requests">
              View all
            </Link>
          }
        >
          {pendingRequests.loading ? (
            <Loading label="Loading requests…" />
          ) : requests.length > 0 ? (
            <div className="doc-timeline">
              {requests.slice(0, 5).map((r) => (
                <div className="doc-timeline-item" key={r.id}>
                  <span className="doc-timeline-dot">
                    <InboxIcon size={16} />
                  </span>
                  <div className="doc-timeline-body">
                    <div className="doc-timeline-head">
                      <strong>{r.patientName || 'Patient'}</strong>
                      <StatusBadge status={r.status} />
                      <span className="doc-timeline-date">{formatDateTime(r.requestedAt)}</span>
                    </div>
                    <p className="doc-muted">{r.medicardId}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<InboxIcon size={26} />}
              title="No pending requests"
              message="Request access from a patient's MediCard and it will appear here until they respond."
              action={
                <Link className="doc-btn doc-btn-sm" to="/doctor/scan">
                  <PlusIcon size={15} /> Request access
                </Link>
              }
            />
          )}
        </Card>
      </div>
    </>
  )
}

export default DoctorDashboard