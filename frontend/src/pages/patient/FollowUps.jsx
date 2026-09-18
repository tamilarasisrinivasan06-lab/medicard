import { getPatientPortalFollowUps } from '../../api'
import { Card, StatCard, Loading, Alert, EmptyState, StatusBadge, useAsync, formatDate } from '../../components/doctor/ui'
import { RepeatIcon, CalendarClockIcon, ClockIcon, CheckIcon } from '../../components/doctor/icons'

function FollowUps() {
  const { data, loading, error } = useAsync(() => getPatientPortalFollowUps(), [])

  if (loading) return <Loading label="Loading follow-ups…" />
  if (error) return <Alert>{error}</Alert>

  const list = data || []
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = list.filter((f) => f.status === 'scheduled' && f.followUpDate >= today)
  const due = list.filter((f) => f.status === 'scheduled' && f.followUpDate < today)

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>Follow-ups</h1>
          <p>Return visits your doctor has scheduled.</p>
        </div>
      </header>

      <div className="doc-stats doc-stats-3">
        <StatCard icon={<CalendarClockIcon size={20} />} label="Upcoming" value={upcoming.length} tone="accent" />
        <StatCard icon={<ClockIcon size={20} />} label="Overdue" value={due.length} tone="amber" />
        <StatCard icon={<CheckIcon size={20} />} label="Completed" value={list.filter((f) => f.status === 'done').length} tone="green" />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<RepeatIcon size={28} />} title="No follow-ups" message="Scheduled follow-ups will appear here." />
      ) : (
        <Card>
          <div className="doc-row-list">
            {list.map((f) => (
              <div key={f.id} className="doc-row-item">
                <span className="doc-activity-icon">
                  <RepeatIcon size={18} />
                </span>
                <div className="doc-row-main">
                  <strong>{f.consultationTitle || 'Follow-up visit'}</strong>
                  <span>
                    {formatDate(f.followUpDate)}
                    {f.doctorName ? ` · ${f.doctorName}` : ''}
                    {f.specialization ? ` (${f.specialization})` : ''}
                  </span>
                  <span className="doc-muted">{f.notes || f.diagnosis || 'No additional notes'}</span>
                </div>
                <StatusBadge status={f.status} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default FollowUps
