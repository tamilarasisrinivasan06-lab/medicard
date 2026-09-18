import { useMemo, useState } from 'react'
import { getSuperAdminUsers, setSuperAdminUserStatus } from '../../api'
import {
  useAsync,
  useToast,
  Card,
  Loading,
  Alert,
  EmptyState,
  PageHeader,
  ConfirmDialog,
  Modal,
  StatusBadge,
  formatDate,
} from '../../components/doctor/ui'
import { SearchIcon } from '../../components/doctor/icons'

function DirectoryPage({ role, title, subtitle, icon, showRole = false }) {
  const { notify } = useToast()
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState(null)
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, reload } = useAsync(() => getSuperAdminUsers({ role }), [role])

  const list = useMemo(() => {
    let items = data || []
    if (!query.trim()) return items
    const q = query.trim().toLowerCase()
    return items.filter((u) =>
      [u.name, u.email, u.phone].some((f) => (f || '').toLowerCase().includes(q))
    )
  }, [data, query])

  async function toggleStatus() {
    if (!target) return
    setBusy(true)
    const res = await setSuperAdminUserStatus(target.id, !target.isActive)
    setBusy(false)
    if (res.success) {
      notify(res.message || 'Account updated')
      setTarget(null)
      reload()
    } else {
      notify(res.message || 'Could not update account', 'error')
    }
  }

  const statusTone = (isActive) => (isActive ? 'danger' : 'success')

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />

      {error && <Alert>{error}</Alert>}

      <Card>
        <div className="doc-toolbar">
          <label className="doc-search">
            <SearchIcon size={16} />
            <input
              type="search"
              placeholder={`Search ${title.toLowerCase()} by name or email`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <span className="doc-muted" style={{ fontSize: 13 }}>{list.length} result{list.length === 1 ? '' : 's'}</span>
        </div>

        {loading ? (
          <Loading label="Loading accounts…" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={icon}
            title={data && data.length > 0 ? 'No matches' : `No ${title.toLowerCase()} yet`}
            message={data && data.length > 0 ? 'Try a different search query.' : 'Accounts will appear here once they are registered.'}
          />
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  {showRole && <th>Role</th>}
                  <th>Hospital</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <button type="button" className="doc-link" onClick={() => setDetail(u)}>
                        {u.name}
                      </button>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    {showRole && <td><span className="doc-badge">{String(u.role || '').replace(/_/g, ' ')}</span></td>}
                    <td>{u.hospitalName || '—'}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td><StatusBadge status={u.isActive ? 'active' : 'disabled'} /></td>
                    <td className="doc-table-actions">
                      <button
                        className={`doc-btn doc-btn-sm ${u.isActive ? 'doc-btn-ghost' : 'doc-btn-success'}`}
                        onClick={() => setTarget(u)}
                      >
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(detail)}
        title={detail ? detail.name : ''}
        onClose={() => setDetail(null)}
        size="sm"
        footer={
          <button type="button" className="doc-btn doc-btn-ghost" onClick={() => setDetail(null)}>
            Close
          </button>
        }
      >
        {detail && (
          <div className="doc-detail-grid">
            <div className="doc-detail-row"><span>Email</span><strong>{detail.email}</strong></div>
            <div className="doc-detail-row"><span>Phone</span><strong>{detail.phone || '—'}</strong></div>
            {showRole && <div className="doc-detail-row"><span>Role</span><strong>{String(detail.role || '').replace(/_/g, ' ')}</strong></div>}
            <div className="doc-detail-row"><span>Hospital</span><strong>{detail.hospitalName || '—'}</strong></div>
            <div className="doc-detail-row"><span>Joined</span><strong>{formatDate(detail.createdAt)}</strong></div>
            <div className="doc-detail-row">
              <span>Status</span>
              <strong><StatusBadge status={detail.isActive ? 'active' : 'disabled'} /></strong>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(target)}
        title={target?.isActive ? 'Disable account?' : 'Enable account?'}
        message={target ? `${target.isActive ? 'Disable' : 'Enable'} ${target.name}'s account?` : ''}
        confirmLabel={target?.isActive ? 'Disable' : 'Enable'}
        tone={target?.isActive ? statusTone(false) : statusTone(true)}
        busy={busy}
        onConfirm={toggleStatus}
        onCancel={() => setTarget(null)}
      />
    </>
  )
}

export default DirectoryPage