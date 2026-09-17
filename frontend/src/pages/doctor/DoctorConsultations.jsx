import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoctorConsultations, getDoctorPatients, createConsultation, updateConsultation, deleteConsultation } from '../../api'
import {
  useAsync,
  useToast,
  Card,
  Loading,
  Alert,
  EmptyState,
  StatusBadge,
  Modal,
  ConfirmDialog,
  Field,
  PageHeader,
  formatDate,
} from '../../components/doctor/ui'
import { StethoscopeIcon, PlusIcon, TrashIcon, EditIcon, SearchIcon } from '../../components/doctor/icons'

const RANGES = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
]

function emptyForm() {
  return { title: '', symptoms: '', diagnosis: '', adviceNotes: '', consultationDate: new Date().toISOString().slice(0, 10), status: 'completed', hospitalName: '' }
}

function DoctorConsultations() {
  const { notify } = useToast()
  const [range, setRange] = useState('all')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const consultations = useAsync(() => getDoctorConsultations(range === 'all' ? undefined : range), [range])
  const patients = useAsync(() => getDoctorPatients(), [])

  const list = useMemo(() => {
    const items = consultations.data || []
    if (!query.trim()) return items
    const q = query.trim().toLowerCase()
    return items.filter((c) => (c.patientName || '').toLowerCase().includes(q) || (c.title || '').toLowerCase().includes(q) || (c.diagnosis || '').toLowerCase().includes(q))
  }, [consultations.data, query])

  async function handleSave(form) {
    setBusy(true)
    const payload = { ...form }
    let res
    if (modal?.mode === 'edit') res = await updateConsultation(modal.consultation.id, payload)
    else res = await createConsultation(form.patientId, payload)
    setBusy(false)
    if (res.success) {
      notify(modal?.mode === 'edit' ? 'Consultation updated' : 'Consultation recorded')
      setModal(null)
      consultations.reload()
    } else {
      notify(res.message || 'Could not save consultation', 'error')
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setBusy(true)
    const res = await deleteConsultation(confirmDelete.id)
    setBusy(false)
    setConfirmDelete(null)
    if (res.success) {
      notify('Consultation deleted')
      consultations.reload()
    } else {
      notify(res.message || 'Could not delete', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Consultations"
        subtitle="Clinical encounters you have recorded for your patients."
        actions={
          <button className="doc-btn" onClick={() => setModal({ mode: 'create', form: emptyForm() })} disabled={!patients.data?.length}>
            <PlusIcon size={16} /> New consultation
          </button>
        }
      />

      {errorFor(consultations, patients) && <Alert>{errorFor(consultations, patients)}</Alert>}

      {patients.data && patients.data.length === 0 && (
        <Alert tone="info">
          You need an authorized patient before recording a consultation.{' '}
          <Link to="/doctor/scan">Request access</Link>.
        </Alert>
      )}

      <Card>
        <div className="doc-toolbar">
          <div className="doc-filter-row">
            {RANGES.map((r) => (
              <button key={r.value} className={`doc-chip-btn${range === r.value ? ' is-active' : ''}`} onClick={() => setRange(r.value)}>
                {r.label}
              </button>
            ))}
          </div>
          <label className="doc-search">
            <SearchIcon size={16} />
            <input type="search" placeholder="Search patient, title, diagnosis" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        {consultations.loading ? (
          <Loading label="Loading consultations…" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<StethoscopeIcon size={26} />}
            title="No consultations"
            message={query ? 'No consultations match your search.' : 'Consultations you record will appear here.'}
          />
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Title</th>
                  <th>Diagnosis</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}>
                    <td>{formatDate(c.consultationDate)}</td>
                    <td><strong>{c.patientName || `Patient #${c.patientId}`}</strong></td>
                    <td>{c.title}</td>
                    <td>{c.diagnosis || <span className="doc-muted">—</span>}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="doc-table-actions">
                      <Link className="doc-btn doc-btn-ghost doc-btn-sm" to={`/doctor/patients/${c.patientId}`}>
                        Open
                      </Link>
                      <button className="doc-btn doc-btn-ghost doc-btn-sm" onClick={() => setModal({ mode: 'edit', consultation: c, form: { ...emptyForm(), ...c, consultationDate: (c.consultationDate || '').slice(0, 10) } })}>
                        <EditIcon size={14} />
                      </button>
                      <button className="doc-btn doc-btn-ghost doc-btn-sm" onClick={() => setConfirmDelete(c)}>
                        <TrashIcon size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConsultationFormModal
        modal={modal}
        patients={patients.data || []}
        busy={busy}
        onClose={() => setModal(null)}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete consultation?"
        message="This consultation will be permanently removed."
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  )
}

function errorFor(...loads) {
  const failed = loads.find((l) => l.error)
  return failed ? failed.error : ''
}

function ConsultationFormModal({ modal, patients, busy, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- reseed the form whenever a different record is opened
    if (modal) setForm(modal.form || emptyForm())
  }, [modal])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const isEdit = modal?.mode === 'edit'

  return (
    <Modal
      open={Boolean(modal)}
      title={isEdit ? 'Edit Consultation' : 'New Consultation'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="doc-btn doc-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="doc-btn" disabled={busy || !form.title.trim() || (!isEdit && !form.patientId)} onClick={() => onSubmit(form)}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Record consultation'}
          </button>
        </>
      }
    >
      {!isEdit && (
        <Field label="Patient" required>
          <select value={form.patientId || ''} onChange={(e) => set('patientId', e.target.value)}>
            <option value="">Select an authorized patient…</option>
            {patients.map((p) => (
              <option key={p.patientId} value={p.patientId}>
                {p.patientName} · {p.medicardId}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Title" required>
        <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Follow-up visit" />
      </Field>
      <div className="doc-grid doc-grid-2">
        <Field label="Date">
          <input type="date" value={form.consultationDate} onChange={(e) => set('consultationDate', e.target.value)} />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="completed">Completed</option>
            <option value="in_progress">In progress</option>
            <option value="follow_up_needed">Follow-up needed</option>
          </select>
        </Field>
      </div>
      <Field label="Symptoms"><textarea rows="2" value={form.symptoms} onChange={(e) => set('symptoms', e.target.value)} /></Field>
      <Field label="Diagnosis"><textarea rows="2" value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} /></Field>
      <Field label="Advice / Notes"><textarea rows="2" value={form.adviceNotes} onChange={(e) => set('adviceNotes', e.target.value)} /></Field>
      <Field label="Hospital / Clinic"><input value={form.hospitalName} onChange={(e) => set('hospitalName', e.target.value)} placeholder="Optional" /></Field>
    </Modal>
  )
}

export default DoctorConsultations