import { getPatientPortalAccessHistory } from '../../api'
import { Card, Loading, Alert, EmptyState, StatusBadge, useAsync, formatDate, formatDateTime } from '../../components/doctor/ui'
import { ShieldIcon, UserCheckIcon, BellIcon, ClockIcon } from '../../components/doctor/icons'

function Settings() {
  const { data, loading, error } = useAsync(() => getPatientPortalAccessHistory(), [])

  const list = data || []
  const active = list.filter((a) => a.status === 'accepted')

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>Settings</h1>
          <p>Manage your privacy and review who has accessed your records.</p>
        </div>
      </header>

      <div className="doc-grid doc-grid-2">
        <Card title="Privacy & security">
          <div className="doc-timeline">
            <div className="doc-timeline-item">
              <span className="doc-timeline-dot" />
              <div className="doc-timeline-body">
                <div className="doc-timeline-head">
                  <strong>
                    <ShieldIcon size={15} /> You control access
                  </strong>
                </div>
                <p className="doc-muted">
                  Doctors must request access and you approve or decline each request. Scanning your Medi Card never
                  grants access automatically.
                </p>
              </div>
            </div>
            <div className="doc-timeline-item">
              <span className="doc-timeline-dot" />
              <div className="doc-timeline-body">
                <div className="doc-timeline-head">
                  <strong>
                    <ClockIcon size={15} /> Time-limited access
                  </strong>
                </div>
                <p className="doc-muted">Approved access expires automatically, and every decision is recorded in your history below.</p>
              </div>
            </div>
            <div className="doc-timeline-item">
              <span className="doc-timeline-dot" />
              <div className="doc-timeline-body">
                <div className="doc-timeline-head">
                  <strong>
                    <BellIcon size={15} /> Notifications
                  </strong>
                </div>
                <p className="doc-muted">You are notified whenever a doctor requests access, when results are released, and when prescriptions are dispensed.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Active access" subtitle={`${active.length} doctor${active.length === 1 ? '' : 's'} currently authorised`}>
          {active.length ? (
            <div className="doc-row-list">
              {active.map((a) => (
                <div key={a.id} className="doc-row-item">
                  <span className="doc-activity-icon">
                    <UserCheckIcon size={18} />
                  </span>
                  <div className="doc-row-main">
                    <strong>{a.doctorName}</strong>
                    <span>
                      {[a.specialization, a.hospitalName].filter(Boolean).join(' · ') || 'Doctor'}
                    </span>
                    <span className="doc-muted">Expires {formatDate(a.expiresAt)}</span>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<ShieldIcon size={28} />} title="No active access" message="No doctor currently has access to your records." />
          )}
        </Card>
      </div>

      <Card title="Access history" subtitle="Every access request and decision">
        {loading && <Loading label="Loading history…" />}
        {error && <Alert>{error}</Alert>}
        {data && list.length === 0 && (
          <EmptyState icon={<ShieldIcon size={28} />} title="No access history" message="Requests from doctors will be listed here." />
        )}
        {list.length > 0 && (
          <div className="doc-row-list">
            {list.map((a) => (
              <div key={a.id} className="doc-row-item">
                <span className="doc-activity-icon">
                  <UserCheckIcon size={18} />
                </span>
                <div className="doc-row-main">
                  <strong>{a.doctorName}</strong>
                  <span>
                    {[a.specialization, a.hospitalName].filter(Boolean).join(' · ') || 'Doctor'}
                    {a.reason ? ` — ${a.reason}` : ''}
                  </span>
                  <span className="doc-muted">
                    Requested {formatDateTime(a.requestedAt)}
                    {a.decidedAt ? ` · decided ${formatDate(a.decidedAt)}` : ''}
                  </span>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default Settings
