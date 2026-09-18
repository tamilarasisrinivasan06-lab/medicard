import { useMemo, useState } from 'react'
import { getPatientPortalDashboard, getPatientPortalAccessHistory, decideDoctorAccess } from '../../api'
import { Card, Alert, EmptyState, StatusBadge, Loading, useAsync, useToast, formatDate, formatDateTime } from '../../components/doctor/ui'
import { UserCheckIcon, CheckIcon, CloseIcon, ShieldIcon } from '../../components/doctor/icons'

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'revoked', label: 'Revoked' },
]

function DoctorAccess() {
  const { notify } = useToast()
  const [tab, setTab] = useState('pending')
  const dashboard = useAsync(() => getPatientPortalDashboard(), [])
  const history = useAsync(() => getPatientPortalAccessHistory(), [])

  const pending = dashboard.data?.accessRequests || []
  const list = useMemo(() => history.data || [], [history.data])
  const approved = list.filter((a) => a.status === 'accepted')
  const revoked = list.filter((a) => a.status !== 'accepted' && a.status !== 'pending')

  async function decide(accessId, decision) {
    const res = await decideDoctorAccess(accessId, decision)
    if (res.success) {
      notify(decision === 'accept' ? 'Access granted' : 'Access declined', 'success')
      dashboard.reload()
      history.reload()
    } else {
      notify(res.message || 'Could not update the request', 'error')
    }
  }

  const rows = tab === 'pending' ? pending : tab === 'approved' ? approved : revoked
  const loading = tab === 'pending' ? dashboard.loading : history.loading
  const error = tab === 'pending' ? dashboard.error : history.error

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>Doctor Access</h1>
          <p>You decide which doctors can view your records.</p>
        </div>
      </header>

      <div className="doc-filter-row">
        {TABS.map((t) => (
          <button key={t.value} className={`doc-chip-btn${tab === t.value ? ' is-active' : ''}`} onClick={() => setTab(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <Loading label="Loading requests…" />
        ) : error ? (
          <Alert>{error}</Alert>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ShieldIcon size={26} />}
            title={tab === 'pending' ? 'No pending requests' : tab === 'approved' ? 'No approved doctors' : 'Nothing revoked'}
            message={tab === 'pending' ? 'New doctor requests will appear here.' : 'Your decisions will be recorded here.'}
          />
        ) : (
          <div className="doc-row-list">
            {rows.map((a) => (
              <div key={a.id} className="doc-row-item">
                <span className="doc-activity-icon">
                  <UserCheckIcon size={18} />
                </span>
                <div className="doc-row-main">
                  <strong>{a.doctorName || 'Doctor'}</strong>
                  <span>{[a.specialization, a.hospitalName].filter(Boolean).join(' · ') || 'Doctor'}</span>
                  <span className="doc-muted">
                    {a.requestedAt ? `Requested ${formatDateTime(a.requestedAt)}` : ''}
                    {a.decidedAt ? ` · decided ${formatDate(a.decidedAt)}` : ''}
                    {a.expiresAt ? ` · expires ${formatDate(a.expiresAt)}` : ''}
                  </span>
                </div>
                {tab === 'pending' ? (
                  <div className="doc-row-actions">
                    <button type="button" className="doc-btn doc-btn-sm doc-btn-success" onClick={() => decide(a.id, 'accept')}>
                      <CheckIcon size={15} /> Accept
                    </button>
                    <button type="button" className="doc-btn doc-btn-sm doc-btn-ghost" onClick={() => decide(a.id, 'reject')}>
                      <CloseIcon size={15} /> Reject
                    </button>
                  </div>
                ) : (
                  <StatusBadge status={a.status} />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default DoctorAccess
