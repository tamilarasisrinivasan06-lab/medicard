import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoctorPrescriptions, getDoctorPatients, createDoctorPrescription } from '../../api'
import {
  useAsync,
  useToast,
  Card,
  Loading,
  Alert,
  EmptyState,
  Modal,
  Field,
  PageHeader,
  formatDate,
} from '../../components/doctor/ui'
import { PillIcon, PlusIcon, TrashIcon, SearchIcon } from '../../components/doctor/icons'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function DoctorPrescriptions() {
  const { notify } = useToast()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, reload } = useAsync(() => getDoctorPrescriptions(), [])
  const patients = useAsync(() => getDoctorPatients(), [])

  const list = useMemo(() => {
    const items = data || []
    if (!query.trim()) return items
    const q = query.trim().toLowerCase()
    return items.filter(
      (p) =>
        (p.patientName || '').toLowerCase().includes(q) ||
        (p.medicardId || '').toLowerCase().includes(q) ||
        (p.diagnosis || '').toLowerCase().includes(q) ||
        p.items.some((it) => (it.medicineName || '').toLowerCase().includes(q))
    )
  }, [data, query])

  async function handleCreate(form) {
    setBusy(true)
    const { patientId, ...payload } = form
    const res = await createDoctorPrescription(patientId, payload)
    setBusy(false)
    if (res.success) {
      notify('Prescription created')
      setOpen(false)
      reload()
    } else {
      notify(res.message || 'Could not create prescription', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Prescriptions"
        subtitle="Medications you have prescribed for your patients."
        actions={
          <button className="doc-btn" onClick={() => setOpen(true)} disabled={!patients.data?.length}>
            <PlusIcon size={16} /> New prescription
          </button>
        }
      />

      {error && <Alert>{error}</Alert>}
      {patients.data && patients.data.length === 0 && (
        <Alert tone="info">
          You need an authorized patient before prescribing. <Link to="/doctor/scan">Request access</Link>.
        </Alert>
      )}

      <Card
        title={`${list.length} prescription${list.length === 1 ? '' : 's'}`}
        actions={
          <label className="doc-search">
            <SearchIcon size={16} />
            <input type="search" placeholder="Search patient, medicine, diagnosis" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        }
      >
        {loading ? (
          <Loading label="Loading prescriptions…" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<PillIcon size={26} />}
            title="No prescriptions"
            message={query ? 'No prescriptions match your search.' : 'Prescriptions you issue will appear here.'}
          />
        ) : (
          <div className="doc-stack">
            {list.map((p) => (
              <div className="doc-card" key={p.id}>
                <div className="doc-flex-between">
                  <div>
                    <strong>{p.patientName || `Patient #${p.patientId}`}</strong>
                    {p.medicardId && <span className="doc-code" style={{ marginLeft: 8 }}>{p.medicardId}</span>}
                    <div className="doc-note">
                      {formatDate(p.prescriptionDate)}
                      {p.diagnosis ? ` · Diagnosis: ${p.diagnosis}` : ''}
                    </div>
                  </div>
                  <Link className="doc-btn doc-btn-ghost doc-btn-sm" to={`/doctor/patients/${p.patientId}`}>
                    Open patient
                  </Link>
                </div>
                <div className="doc-table-wrap" style={{ marginTop: 12 }}>
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Duration</th>
                        <th>Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.items.map((it) => (
                        <tr key={it.id}>
                          <td><strong>{it.medicineName}</strong></td>
                          <td>{it.dosage || '—'}</td>
                          <td>{it.frequency || '—'}</td>
                          <td>{it.duration || '—'}</td>
                          <td>{it.instructions || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {p.notes && <p className="doc-note" style={{ marginTop: 10 }}>Notes: {p.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <NewPrescriptionModal open={open} onClose={() => setOpen(false)} patients={patients.data || []} busy={busy} onSubmit={handleCreate} />
    </>
  )
}

function NewPrescriptionModal({ open, onClose, onSubmit, busy, patients }) {
  const [patientId, setPatientId] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(today())
  const [items, setItems] = useState([{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }])

  const update = (i, k, v) => setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)))
  const addItem = () => setItems((prev) => [...prev, { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }])
  const removeItem = (i) => setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)))

  const valid = patientId && items.some((it) => it.medicineName.trim())

  return (
    <Modal
      open={open}
      title="New Prescription"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="doc-btn doc-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="doc-btn"
            disabled={busy || !valid}
            onClick={() =>
              onSubmit({
                patientId,
                diagnosis,
                notes,
                prescriptionDate: date,
                items: items.filter((it) => it.medicineName.trim()),
              })
            }
          >
            {busy ? 'Saving…' : 'Create prescription'}
          </button>
        </>
      }
    >
      <Field label="Patient" required>
        <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">Select an authorized patient…</option>
          {patients.map((p) => (
            <option key={p.patientId} value={p.patientId}>
              {p.patientName} · {p.medicardId}
            </option>
          ))}
        </select>
      </Field>
      <div className="doc-grid doc-grid-2">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Diagnosis">
          <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="doc-flex-between" style={{ marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>Medicines</strong>
        <button className="doc-btn doc-btn-ghost doc-btn-sm" type="button" onClick={addItem}>
          <PlusIcon size={14} /> Add
        </button>
      </div>
      {items.map((it, index) => (
        <div className="doc-med-card" key={index}>
          <div className="doc-grid doc-grid-2">
            <input placeholder="Medicine name" value={it.medicineName} onChange={(e) => update(index, 'medicineName', e.target.value)} />
            <input placeholder="Dosage" value={it.dosage} onChange={(e) => update(index, 'dosage', e.target.value)} />
            <input placeholder="Frequency" value={it.frequency} onChange={(e) => update(index, 'frequency', e.target.value)} />
            <input placeholder="Duration" value={it.duration} onChange={(e) => update(index, 'duration', e.target.value)} />
          </div>
          <div className="doc-flex" style={{ marginTop: 8 }}>
            <input placeholder="Instructions (optional)" value={it.instructions} onChange={(e) => update(index, 'instructions', e.target.value)} />
            <button className="doc-icon-btn" type="button" onClick={() => removeItem(index)} aria-label="Remove">
              <TrashIcon size={15} />
            </button>
          </div>
        </div>
      ))}
    </Modal>
  )
}

export default DoctorPrescriptions