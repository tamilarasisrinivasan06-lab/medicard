import { useMemo, useState } from 'react'
import { getLabPortalReports } from '../../api'
import { useAsync, Card, Loading, Alert, EmptyState, PageHeader, FileLink, formatDate } from '../../components/doctor/ui'
import { ReportIcon, SearchIcon } from '../../components/doctor/icons'

function LabReports() {
  const [query, setQuery] = useState('')
  const { data, loading, error } = useAsync(() => getLabPortalReports(), [])

  const list = useMemo(() => {
    let items = data || []
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      items = items.filter(
        (r) =>
          (r.patientName || '').toLowerCase().includes(q) ||
          (r.medicardId || '').toLowerCase().includes(q) ||
          (r.title || '').toLowerCase().includes(q)
      )
    }
    return items
  }, [data, query])

  return (
    <>
      <PageHeader title="Lab Reports" subtitle="Reports uploaded by your lab." />

      {error && <Alert>{error}</Alert>}

      <Card>
        <div className="doc-toolbar">
          <span />
          <label className="doc-search">
            <SearchIcon size={16} />
            <input type="search" placeholder="Search patient or report" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        {loading ? (
          <Loading label="Loading reports…" />
        ) : list.length === 0 ? (
          <EmptyState icon={<ReportIcon size={26} />} title="No reports" message="Reports you create for lab requests will appear here." />
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Report</th>
                  <th>Summary</th>
                  <th aria-label="File" />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.reportDate)}</td>
                    <td>
                      <strong>{r.patientName || `Patient #${r.patientId}`}</strong>
                      {r.medicardId && <div className="doc-muted" style={{ fontSize: 12.5 }}>{r.medicardId}</div>}
                    </td>
                    <td>
                      <strong>{r.title}</strong>
                      {r.labRequestTitle && <div className="doc-muted" style={{ fontSize: 12.5 }}>Request: {r.labRequestTitle}</div>}
                    </td>
                    <td>{r.summary || '—'}</td>
                    <td>{r.fileUrl ? <FileLink url={r.fileUrl} /> : <span className="doc-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

export default LabReports
