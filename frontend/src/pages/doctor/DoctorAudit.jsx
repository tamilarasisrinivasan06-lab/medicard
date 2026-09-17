import { useMemo, useState } from 'react'
import { getDoctorAudit } from '../../api'
import { useAsync, Card, Loading, Alert, EmptyState, PageHeader, StatusBadge, formatDateTime } from '../../components/doctor/ui'
import { ShieldIcon, SearchIcon } from '../../components/doctor/icons'

function formatDetails(details) {
  if (!details) return ''
  if (typeof details === 'string') return details
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ')
}

function DoctorAudit() {
  const [query, setQuery] = useState('')
  const { data, loading, error } = useAsync(() => getDoctorAudit(), [])

  const list = useMemo(() => {
    const items = data || []
    if (!query.trim()) return items
    const q = query.trim().toLowerCase()
    return items.filter((l) => (l.action || '').toLowerCase().includes(q) || (l.targetType || '').toLowerCase().includes(q) || formatDetails(l.details).toLowerCase().includes(q))
  }, [data, query])

  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle="Every sensitive action you perform is recorded for compliance and transparency."
      />

      {error && <Alert>{error}</Alert>}

      <Card
        title={`${list.length} entr${list.length === 1 ? 'y' : 'ies'}`}
        actions={
          <label className="doc-search">
            <SearchIcon size={16} />
            <input type="search" placeholder="Search action or target" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        }
      >
        {loading ? (
          <Loading label="Loading audit trail…" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<ShieldIcon size={26} />}
            title="No audit entries"
            message="Actions such as viewing patient data, creating consultations and sending requests will appear here."
          />
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {list.map((l) => (
                  <tr key={l.id}>
                    <td>{formatDateTime(l.createdAt)}</td>
                    <td><StatusBadge status={l.action} /></td>
                    <td>{l.targetType ? `${l.targetType}${l.targetId ? ` #${l.targetId}` : ''}` : '—'}</td>
                    <td>{formatDetails(l.details) || <span className="doc-muted">—</span>}</td>
                    <td>{l.ip || <span className="doc-muted">—</span>}</td>
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

export default DoctorAudit