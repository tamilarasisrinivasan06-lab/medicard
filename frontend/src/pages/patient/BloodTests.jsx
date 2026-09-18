import { getPatientPortalLabReports } from '../../api'
import { Card, StatCard, Loading, Alert, EmptyState, StatusBadge, FileLink, useAsync, formatDate } from '../../components/doctor/ui'
import { DropletIcon, FlaskIcon, ReportIcon } from '../../components/doctor/icons'

function BloodTests() {
  const { data, loading, error } = useAsync(() => getPatientPortalLabReports(), [])

  if (loading) return <Loading label="Loading lab results…" />
  if (error) return <Alert>{error}</Alert>

  const reports = data?.reports || []
  const requests = data?.requests || []
  const pending = requests.filter((r) => r.status !== 'delivered' && r.status !== 'ready').length

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>Blood Tests & Lab Reports</h1>
          <p>Requested tests and the reports your doctor has released.</p>
        </div>
      </header>

      <div className="doc-stats doc-stats-3">
        <StatCard icon={<FlaskIcon size={20} />} label="Tests requested" value={requests.length} tone="accent" />
        <StatCard icon={<DropletIcon size={20} />} label="Awaiting results" value={pending} tone="amber" />
        <StatCard icon={<ReportIcon size={20} />} label="Reports available" value={reports.length} tone="green" />
      </div>

      <Card title="Test requests" subtitle="Tests your doctor has asked you to take">
        {requests.length ? (
          <div className="doc-row-list">
            {requests.map((r) => (
              <div key={r.id} className="doc-row-item">
                <span className="doc-activity-icon">
                  <DropletIcon size={18} />
                </span>
                <div className="doc-row-main">
                  <strong>{r.title}</strong>
                  <span>{r.tests}</span>
                  <span className="doc-muted">
                    {formatDate(r.requestedAt)}
                    {r.doctorName ? ` · ${r.doctorName}` : ''}
                  </span>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<FlaskIcon size={28} />} title="No test requests" message="Your doctor's lab requests will appear here." />
        )}
      </Card>

      <Card title="Reports" subtitle="Released laboratory reports">
        {reports.length ? (
          <div className="doc-row-list">
            {reports.map((r) => (
              <div key={r.id} className="doc-row-item">
                <span className="doc-activity-icon">
                  <ReportIcon size={18} />
                </span>
                <div className="doc-row-main">
                  <strong>{r.title}</strong>
                  <span>{r.summary || 'Report available'}</span>
                  <span className="doc-muted">
                    {formatDate(r.reportDate)}
                    {r.doctorName ? ` · ${r.doctorName}` : ''}
                  </span>
                </div>
                {r.fileUrl && <FileLink url={r.fileUrl}>Open report</FileLink>}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<ReportIcon size={28} />} title="No reports yet" message="Lab reports released to you will appear here." />
        )}
      </Card>
    </div>
  )
}

export default BloodTests
