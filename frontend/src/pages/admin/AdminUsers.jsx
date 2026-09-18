import { useMemo, useState } from 'react'
import { getAdminUsers, setAdminUserStatus, getRole } from '../../api'
import { useAsync, useToast, Card, Loading, Alert, EmptyState, PageHeader, ConfirmDialog, formatDate } from '../../components/doctor/ui'
import { PatientsIcon, SearchIcon } from '../../components/doctor/icons'

const ROLE_FILTERS = [
  { value: 'all', label: 'All roles' },
  { value: 'patient', label: 'Patients' },
  { value: 'doctor', label: 'Doctors' },
  { value: 'pharmacist', label: 'Pharmacists' },
  { value: 'diagnostic_staff', label: 'Lab staff' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'admin', label: 'Admins' },
]

function AdminUsers() {
  const { notify } = useToast()
  const role = getRole()
  const [roleFilter, setRoleFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, reload } = useAsync(() => getAdminUsers(), [])

  const list = useMemo(() => {
    let items = data || []
    if (roleFilter !== 'all') items = items.filter((u) => u.role === roleFilter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      items = items.filter((u) => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
    }
    return items
  }, [data, roleFilter, query])

  async function toggleStatus() {
    if (!target) return
    setBusy(true)
    const res = await setAdminUserStatus(target.id, !target.isActive)
    setBusy(false)
    if (res.success) {
      notify(res.message || 'Account updated')
      setTarget(null)
      reload()
    } else {
      notify(res.message || 'Could not update account', 'error')
    }
  }

  return (
    <>
      <PageHeader title="Users" subtitle={role === 'hospital' ? 'Accounts linked to your hospital.' : 'All MediCard accounts.'} />

      {error && <Alert>{error}</Alert>}

      <Card>
        <div className="doc-toolbar">
          <div className="doc-filter-row">
            {ROLE_FILTERS.map((f) => (
              <button key={f.value} className={`doc-chip-btn${roleFilter === f.value ? ' is-active' : ''}`} onClick={() => setRoleFilter(f.value)}>
                {f.label}
              </button>
            ))}
          </div>
          <label className="doc-search">
            <SearchIcon size={16} />
            <input type="search" placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        {loading ? (
          <Loading label="Loading users…" />
        ) : list.length === 0 ? (
          <EmptyState icon={<PatientsIcon size={26} />} title="No users" message="No accounts match this filter." />
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Hospital</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td><span className="doc-badge">{String(u.role || '').replace(/_/g, ' ')}</span></td>
                    <td>{u.hospitalName || '—'}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      <span className={`doc-badge ${u.isActive ? 'doc-badge-active' : 'doc-badge-cancelled'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="doc-table-actions">
                      <button className={`doc-btn doc-btn-sm ${u.isActive ? 'doc-btn-ghost' : 'doc-btn-success'}`} onClick={() => setTarget(u)}>
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

      <ConfirmDialog
        open={Boolean(target)}
        title={target?.isActive ? 'Disable account?' : 'Enable account?'}
        message={target ? `${target.isActive ? 'Disable' : 'Enable'} ${target.name}'s account?` : ''}
        confirmLabel={target?.isActive ? 'Disable' : 'Enable'}
        tone={target?.isActive ? 'danger' : 'success'}
        busy={busy}
        onConfirm={toggleStatus}
        onCancel={() => setTarget(null)}
      />
    </>
  )
}

export default AdminUsers
