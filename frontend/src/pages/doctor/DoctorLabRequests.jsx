import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoctorLabRequests, getDoctorPatients, createLabRequest, updateLabRequestStatus } from '../../api'
import {
  useAsync,
  useToast,
  Card,
  Loading,
  Alert,
  EmptyState,
  StatusBadge,
  Modal,
  Field,
  PageHeader,
  formatDate,
} from '../../components/doctor/ui'
import { FlaskIcon, PlusIcon, SearchIcon } from '../../components/doctor/icons'

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_OPTIONS = ['requested', 'in_progress', 'ready', 'delivered', 'cancelled']

function DoctorLabRequests() {
  const { notify } = useToast()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const { data, loading, error, reload } = useAsync(() => getDoctorLabRequests(), [])
  const patients = useAsync(() => getDoctorPatients(), [])

  const list = useMemo(() => {
    let items = data || []
    if (filter !== 'all') items = items.filter((r) => r.status === filter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      items = items.filter((r) => (r.patientName || '').toLowerCase().includes(q) || (r.title || '').toLowerCase().includes(q) || (r.tests || '').toLowerCase().includes(q))
    }
    return items
  }, [data, filter, query])

  async function handleCreate(form) {
    setBusy(true)
    const { patientId, ...payload } = form
    const res = await createLabRequest(patientId, payload)
    setBusy(false)
    if (res.success) {
      notify('Lab request created')
      setOpen(false)
      reload()
    } else {
      notify(res.message || 'Could not create lab request', 'error')
    }
  }

  async function changeStatus(request, status) {
    setBusyId(request.id)
    const res = await updateLabRequestStatus(request.id, status)
    setBusyId(null)
    if (res.success) {
      notify('Lab request updated')
      reload()
    } else {
      notify(res.message || 'Could not update request', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Lab Requests"
        subtitle="Tests you have ordered for your patients."
        actions={
          <button className="doc-btn" onClick={() => setOpen(true)} disabled={!patients.data?.length}>
            <PlusIcon size={16} /> New lab request
          </button>
        }
      />

      {error && <Alert>{error}</Alert>}

      <Card>
        <div className="doc-toolbar">
          <div className="doc-filter-row">
            {STATUS_FILTERS.map((f) => (
              <button key={f.value} className={`doc-chip-btn${filter === f.value ? ' is-active' : ''}`} onClick={() => setFilter(f.value)}>
                {f.label}
              </button>
            ))}
          </div>
          <label className="doc-search">
            <SearchIcon size={16} />
            <input type="search" placeholder="Search patient or test" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        {loading ? (
          <Loading label="Loading lab requests…" />
        ) : list.length === 0 ? (
          <EmptyState icon={<FlaskIcon size={26} />} title="No lab requests" message="Request lab tests for an authorized patient to see them here." />
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>Patient</th>
                  <th>Title / Tests</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.requestedAt)}</td>
                    <td><strong>{r.patientName || `Patient #${r.patientId}`}</strong></td>
                    <td>
                      <strong>{r.title}</strong>
                      <div className="doc-muted" style={{ fontSize: 12.5 }}>{r.tests}</div>
                    </td>
                    <td><StatusBadge status={r.priority} /></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="doc-table-actions">
                      <Link className="doc-btn doc-btn-ghost doc-btn-sm" to={`/doctor/patients/${r.patientId}`}>
                        Open
                      </Link>
                      <select className="doc-select-sm" value={r.status} disabled={busyId === r.id} onChange={(e) => changeStatus(r, e.target.value)}>
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <NewLabRequestModal open={open} onClose={() => setOpen(false)} patients={patients.data || []} busy={busy} onSubmit={handleCreate} />
    </>
  )
}

function NewLabRequestModal({ open, onClose, onSubmit, busy, patients }) {
  const [form, setForm] = useState({ patientId: '', title: '', tests: '', instructions: '', priority: 'routine' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Modal
      open={open}
      title="New Lab Request"
      onClose={onClose}
      footer={
        <>
          <button className="doc-btn doc-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="doc-btn" disabled={busy || !form.patientId || !form.title.trim() || !form.tests.trim()} onClick={() => onSubmit(form)}>
            {busy ? 'Saving…' : 'Create request'}
          </button>
        </>
      }
    >
      <Field label="Patient" required>
        <select value={form.patientId} onChange={(e) => set('patientId', e.target.value)}>
          <option value="">Select an authorized patient…</option>
          {patients.map((p) => (
            <option key={p.patientId} value={p.patientId}>
              {p.patientName} · {p.medicardId}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title" required>
        <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Cardiac panel" />
      </Field>
      <Field label="Tests" required hint="Comma-separated list of tests">
        <textarea rows="2" value={form.tests} onChange={(e) => set('tests', e.target.value)} />
      </Field>
      <Field label="Priority">
        <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
          <option value="routine">Routine</option>
          <option value="urgent">Urgent</option>
          <option value="stat">STAT</option>
        </select>
      </Field>
      <Field label="Instructions">
        <textarea rows="2" value={form.instructions} onChange={(e) => set('instructions', e.target.value)} />
      </Field>
    </Modal>
  )
}

export default DoctorLabRequests