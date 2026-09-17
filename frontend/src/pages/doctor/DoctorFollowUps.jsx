import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoctorFollowUps, getDoctorPatients, createFollowUp, updateFollowUpStatus } from '../../api'
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
import { RepeatIcon, PlusIcon, ClockIcon } from '../../components/doctor/icons'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_OPTIONS = ['scheduled', 'done', 'cancelled']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function DoctorFollowUps() {
  const { notify } = useToast()
  const [filter, setFilter] = useState('all')
  const [dueOnly, setDueOnly] = useState(false)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const { data, loading, error, reload } = useAsync(
    () => getDoctorFollowUps({ status: filter === 'all' ? undefined : filter, dueOnly: dueOnly ? 'true' : undefined }),
    [filter, dueOnly]
  )
  const patients = useAsync(() => getDoctorPatients(), [])

  const list = data || []
  const dueCount = useMemo(() => {
    const t = today()
    return (data || []).filter((f) => f.status === 'scheduled' && (f.followUpDate || '').slice(0, 10) <= t).length
  }, [data])

  async function handleCreate(form) {
    setBusy(true)
    const { patientId, ...payload } = form
    const res = await createFollowUp(patientId, payload)
    setBusy(false)
    if (res.success) {
      notify('Follow-up scheduled')
      setOpen(false)
      reload()
    } else {
      notify(res.message || 'Could not schedule follow-up', 'error')
    }
  }

  async function changeStatus(item, status) {
    setBusyId(item.id)
    const res = await updateFollowUpStatus(item.id, status)
    setBusyId(null)
    if (res.success) {
      notify('Follow-up updated')
      reload()
    } else {
      notify(res.message || 'Could not update follow-up', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Follow-ups"
        subtitle="Scheduled patient reviews and reminders."
        actions={
          <button className="doc-btn" onClick={() => setOpen(true)} disabled={!patients.data?.length}>
            <PlusIcon size={16} /> Schedule follow-up
          </button>
        }
      />

      {error && <Alert>{error}</Alert>}

      <Card>
        <div className="doc-flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="doc-filter-row">
            {FILTERS.map((f) => (
              <button key={f.value} className={`doc-chip-btn${filter === f.value ? ' is-active' : ''}`} onClick={() => setFilter(f.value)}>
                {f.label}
              </button>
            ))}
          </div>
          <label className="doc-switch">
            <input type="checkbox" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)} />
            <span>Due only</span>
          </label>
        </div>

        {dueOnly && dueCount > 0 && (
          <Alert tone="info">
            <ClockIcon size={16} /> {dueCount} follow-up{dueCount === 1 ? '' : 's'} are due.
          </Alert>
        )}

        <div className="doc-mt">
          {loading ? (
            <Loading label="Loading follow-ups…" />
          ) : list.length === 0 ? (
            <EmptyState icon={<RepeatIcon size={26} />} title="No follow-ups" message="Schedule a follow-up to keep patients on track." />
          ) : (
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Follow-up date</th>
                    <th>Patient</th>
                    <th>Notes</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((f) => (
                    <tr key={f.id}>
                      <td><strong>{formatDate(f.followUpDate)}</strong></td>
                      <td>{f.patientName || `Patient #${f.patientId}`}</td>
                      <td>{f.notes || <span className="doc-muted">—</span>}</td>
                      <td><StatusBadge status={f.status} /></td>
                      <td className="doc-table-actions">
                        <Link className="doc-btn doc-btn-ghost doc-btn-sm" to={`/doctor/patients/${f.patientId}`}>
                          Open
                        </Link>
                        <select className="doc-select-sm" value={f.status} disabled={busyId === f.id} onChange={(e) => changeStatus(f, e.target.value)}>
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <NewFollowUpModal open={open} onClose={() => setOpen(false)} patients={patients.data || []} busy={busy} onSubmit={handleCreate} />
    </>
  )
}

function NewFollowUpModal({ open, onClose, onSubmit, busy, patients }) {
  const [form, setForm] = useState({ patientId: '', followUpDate: today(), notes: '' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Modal
      open={open}
      title="Schedule Follow-up"
      onClose={onClose}
      footer={
        <>
          <button className="doc-btn doc-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="doc-btn" disabled={busy || !form.patientId || !form.followUpDate} onClick={() => onSubmit(form)}>
            {busy ? 'Saving…' : 'Schedule'}
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
      <Field label="Follow-up date" required>
        <input type="date" value={form.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} />
      </Field>
      <Field label="Notes">
        <textarea rows="2" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
    </Modal>
  )
}

export default DoctorFollowUps