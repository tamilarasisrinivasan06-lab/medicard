import { getAdminActivity } from '../../api'
import { useAsync, Card, Loading, Alert, EmptyState, PageHeader, formatDateTime } from '../../components/doctor/ui'
import { ShieldIcon } from '../../components/doctor/icons'

function AdminActivity() {
  const { data, loading, error } = useAsync(() => getAdminActivity(), [])

  return (
    <>
      <PageHeader title="Activity Log" subtitle="Audit trail of actions across the platform." />

      {error && <Alert>{error}</Alert>}

      <Card>
        {loading ? (
          <Loading label="Loading activity…" />
        ) : (data || []).length === 0 ? (
          <EmptyState icon={<ShieldIcon size={26} />} title="No activity" message="Actions will appear here as they happen." />
        ) : (
          <ul className="doc-timeline">
            {(data || []).map((a) => (
              <li key={a.id} className="doc-timeline-item">
                <span className="doc-timeline-dot"><ShieldIcon size={16} /></span>
                <div className="doc-timeline-body">
                  <div className="doc-timeline-head">
                    <strong>{String(a.action || '').replace(/_/g, ' ')}</strong>
                    <span className="doc-timeline-date">{formatDateTime(a.createdAt)}</span>
                  </div>
                  <p>
                    {a.userName}
                    {a.role ? ` · ${String(a.role).replace(/_/g, ' ')}` : ''}
                    {a.targetType ? ` · ${a.targetType}${a.targetId ? ` #${a.targetId}` : ''}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

export default AdminActivity
