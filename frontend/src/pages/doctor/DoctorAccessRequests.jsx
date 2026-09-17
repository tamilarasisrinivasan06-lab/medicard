import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAccessRequests, revokePatientAccess } from '../../api'
import { useAsync, useToast, Card, Loading, Alert, EmptyState, StatusBadge, Tabs, ConfirmDialog, PageHeader, formatDateTime } from '../../components/doctor/ui'
import { InboxIcon, ScanIcon, TrashIcon } from '../../components/doctor/icons'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'revoked', label: 'Revoked' },
  { value: 'expired', label: 'Expired' },
]

function DoctorAccessRequests() {
  const { notify } = useToast()
  const [filter, setFilter] = useState('all')
  const [confirmRevoke, setConfirmRevoke] = useState(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, reload } = useAsync(
    () => getAccessRequests(filter === 'all' ? undefined : filter),
    [filter]
  )
  const requests = data || []

  async function handleRevoke() {
    if (!confirmRevoke) return
    setBusy(true)
    const res = await revokePatientAccess(confirmRevoke.patientId)
    setBusy(false)
    setConfirmRevoke(null)
    if (res.success) {
      notify('Access revoked')
      reload()
    } else {
      notify(res.message || 'Could not revoke access', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Patient Access Requests"
        subtitle="Track every request you have sent. You can view records only while access is active."
        actions={
          <Link className="doc-btn" to="/doctor/scan">
            <ScanIcon size={16} /> New request
          </Link>
        }
      />

      <Card>
        <Tabs tabs={FILTERS} active={filter} onChange={setFilter} />

        {error && <Alert>{error}</Alert>}

        <div className="doc-mt">
          {loading ? (
            <Loading label="Loading requests…" />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={<InboxIcon size={26} />}
              title="No requests here"
              message={filter === 'all' ? 'You have not requested access to any patient yet.' : `No ${filter} requests.`}
              action={
                <Link className="doc-btn doc-btn-sm" to="/doctor/scan">
                  <ScanIcon size={15} /> Request access
                </Link>
              }
            />
          ) : (
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>MediCard ID</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Decided</th>
                    <th>Expires</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.patientName || 'Patient'}</strong>
                        {r.reason && <div className="doc-muted" style={{ fontSize: 12.5 }}>{r.reason}</div>}
                      </td>
                      <td><span className="doc-code">{r.medicardId}</span></td>
                      <td><StatusBadge status={r.status} /></td>
                      <td>{formatDateTime(r.requestedAt)}</td>
                      <td>{r.decidedAt ? formatDateTime(r.decidedAt) : <span className="doc-muted">—</span>}</td>
                      <td>{r.status === 'accepted' ? formatDateTime(r.expiresAt) : <span className="doc-muted">—</span>}</td>
                      <td className="doc-table-actions">
                        {r.status === 'accepted' ? (
                          <>
                            <Link className="doc-btn doc-btn-ghost doc-btn-sm" to={`/doctor/patients/${r.patientId}`}>
                              Open
                            </Link>
                            <button className="doc-btn doc-btn-ghost doc-btn-sm" onClick={() => setConfirmRevoke(r)}>
                              <TrashIcon size={14} /> Revoke
                            </button>
                          </>
                        ) : (
                          <span className="doc-muted" style={{ fontSize: 12 }}>
                            {r.status === 'pending' ? 'Awaiting patient' : 'No action'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmRevoke)}
        title="Revoke patient access?"
        message={`You will lose access to ${confirmRevoke?.patientName || 'this patient'}'s records immediately.`}
        confirmLabel="Revoke access"
        tone="danger"
        busy={busy}
        onConfirm={handleRevoke}
        onCancel={() => setConfirmRevoke(null)}
      />
    </>
  )
}

export default DoctorAccessRequests