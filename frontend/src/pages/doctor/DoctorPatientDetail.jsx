import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getPatientTimeline,
  getDoctorConsultations,
  getDoctorPrescriptions,
  getDoctorLabRequests,
  getDoctorLabReports,
  getDoctorDocuments,
  getDoctorFollowUps,
  revokePatientAccess,
  createConsultation,
  createDoctorPrescription,
  createLabRequest,
  createLabReport,
  createDocument,
  createFollowUp,
  deleteDocument,
  deleteConsultation,
} from '../../api'
import {
  useAsync,
  useToast,
  Card,
  Loading,
  Alert,
  EmptyState,
  StatusBadge,
  Tabs,
  Modal,
  ConfirmDialog,
  Field,
  PageHeader,
  formatDate,
  formatDateTime,
} from '../../components/doctor/ui'
import {
  StethoscopeIcon,
  PillIcon,
  FlaskIcon,
  ReportIcon,
  FolderIcon,
  RepeatIcon,
  HeartIcon,
  AlertIcon,
  ReportIcon as RecordsIcon,
  PlusIcon,
  TrashIcon,
  ScanIcon,
} from '../../components/doctor/icons'

const DOC_CATEGORIES = ['report', 'scan', 'prescription', 'discharge_summary', 'insurance', 'other']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function ageFromDob(dob) {
  if (!dob) return '—'
  const b = new Date(dob)
  if (Number.isNaN(b.getTime())) return '—'
  const years = Math.floor((Date.now() - b.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  return `${years} yrs`
}

function PatientDetail() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  const [tab, setTab] = useState('overview')
  const [modal, setModal] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [confirmDeleteConsult, setConfirmDeleteConsult] = useState(null)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null)

  const timeline = useAsync(() => getPatientTimeline(patientId), [patientId])
  const consultations = useAsync(() => getDoctorConsultations(), [])
  const prescriptions = useAsync(() => getDoctorPrescriptions(), [])
  const labRequests = useAsync(() => getDoctorLabRequests(), [])
  const labReports = useAsync(() => getDoctorLabReports(), [])
  const documents = useAsync(() => getDoctorDocuments(patientId), [patientId])
  const followUps = useAsync(() => getDoctorFollowUps(), [])

  const patient = timeline.data?.patient
  const access = timeline.data?.access

  function reloadAll() {
    timeline.reload()
    consultations.reload()
    prescriptions.reload()
    labRequests.reload()
    labReports.reload()
    documents.reload()
    followUps.reload()
  }

  const byPatient = useMemo(() => {
    const match = (x) => String(x.patientId) === String(patientId)
    return {
      consultations: (consultations.data || []).filter(match),
      prescriptions: (prescriptions.data || []).filter(match),
      labRequests: (labRequests.data || []).filter(match),
      labReports: (labReports.data || []).filter(match),
      documents: documents.data || [],
      followUps: (followUps.data || []).filter(match),
    }
  }, [consultations.data, prescriptions.data, labRequests.data, labReports.data, documents.data, followUps.data, patientId])

  if (timeline.loading) return <Loading label="Loading patient record…" />
  if (timeline.error) {
    const isAccess = /access/i.test(timeline.error)
    return (
      <Card>
        <Alert>{timeline.error}</Alert>
        {isAccess && (
          <div className="doc-inline-actions">
            <button className="doc-btn" onClick={() => navigate('/doctor/scan')}>
              <ScanIcon size={16} /> Request access
            </button>
            <button className="doc-btn doc-btn-ghost" onClick={() => navigate('/doctor/access-requests')}>
              View requests
            </button>
          </div>
        )}
      </Card>
    )
  }

  async function handleRevoke() {
    setBusy(true)
    const res = await revokePatientAccess(patientId)
    setBusy(false)
    setConfirmRevoke(false)
    if (res.success) {
      notify('Access revoked')
      navigate('/doctor/patients')
    } else {
      notify(res.message || 'Could not revoke access', 'error')
    }
  }

  async function handleDeleteConsultation() {
    if (!confirmDeleteConsult) return
    setBusy(true)
    const res = await deleteConsultation(confirmDeleteConsult.id)
    setBusy(false)
    setConfirmDeleteConsult(null)
    if (res.success) {
      notify('Consultation deleted')
      reloadAll()
    } else {
      notify(res.message || 'Could not delete', 'error')
    }
  }

  async function handleDeleteDocument() {
    if (!confirmDeleteDoc) return
    setBusy(true)
    const res = await deleteDocument(confirmDeleteDoc.id)
    setBusy(false)
    setConfirmDeleteDoc(null)
    if (res.success) {
      notify('Document deleted')
      documents.reload()
    } else {
      notify(res.message || 'Could not delete', 'error')
    }
  }

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'records', label: `Medical Records (${timeline.data?.records?.length || 0})` },
    { value: 'consultations', label: `Consultations (${byPatient.consultations.length})` },
    { value: 'prescriptions', label: `Prescriptions (${byPatient.prescriptions.length})` },
    { value: 'lab', label: `Lab (${byPatient.labRequests.length + byPatient.labReports.length})` },
    { value: 'documents', label: `Documents (${byPatient.documents.length})` },
  ]

  return (
    <>
      <PageHeader
        title={patient?.name || 'Patient'}
        subtitle={`MediCard ${patient?.medicardId || '—'} · ${ageFromDob(patient?.dateOfBirth)} · ${patient?.gender || '—'} · Blood group ${patient?.bloodGroup || '—'}`}
        actions={
          <>
            <button className="doc-btn doc-btn-ghost" onClick={() => setModal('followUp')}>
              <RepeatIcon size={16} /> Follow-up
            </button>
            <button className="doc-btn" onClick={() => setModal('consultation')}>
              <PlusIcon size={16} /> New Consultation
            </button>
          </>
        }
      />

      <Card className="doc-access-banner">
        <div className="doc-flex-between">
          <div className="doc-flex">
            <ShieldMini />
            <div>
              <strong>Active access granted by patient</strong>
              <div className="doc-note">Expires {formatDateTime(access?.expiresAt)} · Requested {formatDate(access?.requestedAt)}</div>
            </div>
          </div>
          <button className="doc-btn doc-btn-danger doc-btn-sm" onClick={() => setConfirmRevoke(true)}>
            Revoke access
          </button>
        </div>
      </Card>

      <div className="doc-mt">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === 'overview' && (
        <div className="doc-grid doc-grid-2">
          <Card title="Patient Details">
            <div className="doc-detail-grid">
              <Detail label="Full name" value={patient?.name} />
              <Detail label="MediCard ID" value={<span className="doc-code">{patient?.medicardId}</span>} />
              <Detail label="Date of birth" value={formatDate(patient?.dateOfBirth)} />
              <Detail label="Gender" value={patient?.gender} />
              <Detail label="Blood group" value={patient?.bloodGroup} />
              <Detail label="Height / Weight" value={`${patient?.height || '—'} cm / ${patient?.weight || '—'} kg`} />
              <Detail label="City / State" value={[patient?.city, patient?.state].filter(Boolean).join(', ') || '—'} />
              <Detail label="Pincode" value={patient?.pincode} />
              <Detail label="Emergency contact" value={patient?.emergencyContact?.name || '—'} />
              <Detail label="Emergency phone" value={patient?.emergencyContact?.phone || '—'} />
            </div>
          </Card>

          <Card title="Allergies" subtitle="Known allergies and reactions">
            {timeline.data?.allergies?.length ? (
              <div className="doc-timeline">
                {timeline.data.allergies.map((a) => (
                  <div className="doc-timeline-item" key={a.id}>
                    <span className="doc-timeline-dot">
                      <AlertIcon size={16} />
                    </span>
                    <div className="doc-timeline-body">
                      <div className="doc-timeline-head">
                        <strong>{a.allergen}</strong>
                        {a.severity && <StatusBadge status={a.severity} />}
                      </div>
                      {a.reaction && <p>{a.reaction}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<HeartIcon size={24} />} title="No known allergies" message="No allergies recorded for this patient." />
            )}
          </Card>

          <Card title="Current Medications" subtitle="Active and recent prescriptions" className="doc-span-2">
            {timeline.data?.medications?.length ? (
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                      <th>Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.data.medications.map((m) => (
                      <tr key={m.id}>
                        <td><strong>{m.medicineName}</strong></td>
                        <td>{m.dosage || '—'}</td>
                        <td>{m.frequency || '—'}</td>
                        <td>{m.duration || '—'}</td>
                        <td>{formatDate(m.startDate)} – {formatDate(m.endDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={<PillIcon size={24} />} title="No medications" message="No medication history is recorded." />
            )}
          </Card>
        </div>
      )}

      {tab === 'records' && (
        <Card title="Medical Records" subtitle="Chronological history from all sources">
          {timeline.data?.records?.length ? (
            <div className="doc-timeline">
              {timeline.data.records.map((r) => (
                <div className="doc-timeline-item" key={r.id}>
                  <span className="doc-timeline-dot">
                    <RecordsIcon size={16} />
                  </span>
                  <div className="doc-timeline-body">
                    <div className="doc-timeline-head">
                      <strong>{r.title}</strong>
                      <StatusBadge status={r.recordType} />
                      <span className="doc-timeline-date">{formatDate(r.recordDate)}</span>
                    </div>
                    {r.description && <p>{r.description}</p>}
                    {r.diagnosis && <p className="doc-muted">Diagnosis: {r.diagnosis}</p>}
                    <p className="doc-muted" style={{ fontSize: 12.5 }}>
                      {[r.doctorName, r.hospitalName].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<RecordsIcon size={26} />} title="No medical records" message="This patient has no recorded medical history yet." />
          )}
        </Card>
      )}

      {tab === 'consultations' && (
        <Card
          title="Consultations"
          actions={
            <button className="doc-btn doc-btn-sm" onClick={() => setModal('consultation')}>
              <PlusIcon size={15} /> New
            </button>
          }
        >
          {byPatient.consultations.length ? (
            <div className="doc-timeline">
              {byPatient.consultations.map((c) => (
                <div className="doc-timeline-item" key={c.id}>
                  <span className="doc-timeline-dot">
                    <StethoscopeIcon size={16} />
                  </span>
                  <div className="doc-timeline-body">
                    <div className="doc-timeline-head">
                      <strong>{c.title}</strong>
                      <StatusBadge status={c.status} />
                      <span className="doc-timeline-date">{formatDate(c.consultationDate)}</span>
                    </div>
                    {c.symptoms && <p>Symptoms: {c.symptoms}</p>}
                    {c.diagnosis && <p className="doc-muted">Diagnosis: {c.diagnosis}</p>}
                    {c.adviceNotes && <p className="doc-muted">Advice: {c.adviceNotes}</p>}
                    <div className="doc-inline-actions doc-mt" style={{ marginTop: 8 }}>
                      <button className="doc-btn doc-btn-ghost doc-btn-sm" onClick={() => setConfirmDeleteConsult(c)}>
                        <TrashIcon size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<StethoscopeIcon size={26} />}
              title="No consultations recorded"
              message="Record a consultation to build this patient's clinical timeline."
              action={
                <button className="doc-btn doc-btn-sm" onClick={() => setModal('consultation')}>
                  <PlusIcon size={15} /> New consultation
                </button>
              }
            />
          )}
        </Card>
      )}

      {tab === 'prescriptions' && (
        <Card
          title="Prescriptions"
          actions={
            <button className="doc-btn doc-btn-sm" onClick={() => setModal('prescription')}>
              <PlusIcon size={15} /> New
            </button>
          }
        >
          {byPatient.prescriptions.length ? (
            <div className="doc-grid doc-grid-2">
              {byPatient.prescriptions.map((p) => (
                <div className="doc-card" key={p.id} style={{ margin: 0 }}>
                  <div className="doc-flex-between">
                    <strong>{formatDate(p.prescriptionDate)}</strong>
                    <StatusBadge status="accepted" />
                  </div>
                  {p.diagnosis && <p className="doc-note">Diagnosis: {p.diagnosis}</p>}
                  <div className="doc-table-wrap doc-mt" style={{ marginTop: 12 }}>
                    <table className="doc-table" style={{ minWidth: 0 }}>
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.items.map((it) => (
                          <tr key={it.id}>
                            <td>{it.medicineName}</td>
                            <td>{it.dosage || '—'}</td>
                            <td>{it.frequency || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<PillIcon size={26} />}
              title="No prescriptions"
              message="Prescriptions you issue for this patient will appear here."
              action={
                <button className="doc-btn doc-btn-sm" onClick={() => setModal('prescription')}>
                  <PlusIcon size={15} /> New prescription
                </button>
              }
            />
          )}
        </Card>
      )}

      {tab === 'lab' && (
        <div className="doc-grid doc-grid-2">
          <Card
            title="Lab Requests"
            actions={
              <button className="doc-btn doc-btn-sm" onClick={() => setModal('labRequest')}>
                <PlusIcon size={15} /> Request tests
              </button>
            }
          >
            {byPatient.labRequests.length ? (
              <div className="doc-timeline">
                {byPatient.labRequests.map((r) => (
                  <div className="doc-timeline-item" key={r.id}>
                    <span className="doc-timeline-dot">
                      <FlaskIcon size={16} />
                    </span>
                    <div className="doc-timeline-body">
                      <div className="doc-timeline-head">
                        <strong>{r.title}</strong>
                        <StatusBadge status={r.status} />
                        <span className="doc-timeline-date">{formatDate(r.requestedAt)}</span>
                      </div>
                      <p>{r.tests}</p>
                      {r.instructions && <p className="doc-muted">{r.instructions}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<FlaskIcon size={24} />} title="No lab requests" message="Order tests for this patient." />
            )}
          </Card>

          <Card
            title="Lab Reports"
            actions={
              <button className="doc-btn doc-btn-sm" onClick={() => setModal('labReport')}>
                <PlusIcon size={15} /> Add result
              </button>
            }
          >
            {byPatient.labReports.length ? (
              <div className="doc-timeline">
                {byPatient.labReports.map((r) => (
                  <div className="doc-timeline-item" key={r.id}>
                    <span className="doc-timeline-dot">
                      <ReportIcon size={16} />
                    </span>
                    <div className="doc-timeline-body">
                      <div className="doc-timeline-head">
                        <strong>{r.title}</strong>
                        <span className="doc-timeline-date">{formatDate(r.reportDate)}</span>
                      </div>
                      {r.summary && <p>{r.summary}</p>}
                      {r.reportText && <p className="doc-muted">{r.reportText}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<ReportIcon size={24} />} title="No lab reports" message="Add results once tests are completed." />
            )}
          </Card>
        </div>
      )}

      {tab === 'documents' && (
        <Card
          title="Medical Documents"
          subtitle="Reports, scans and files attached to this patient"
          actions={
            <button className="doc-btn doc-btn-sm" onClick={() => setModal('document')}>
              <PlusIcon size={15} /> Add document
            </button>
          }
        >
          {byPatient.documents.length ? (
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Notes</th>
                    <th>Added</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {byPatient.documents.map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.title}</strong></td>
                      <td><StatusBadge status={d.category} /></td>
                      <td>{d.notes || '—'}</td>
                      <td>{formatDate(d.createdAt)}</td>
                      <td className="doc-table-actions">
                        <button className="doc-btn doc-btn-ghost doc-btn-sm" onClick={() => setConfirmDeleteDoc(d)}>
                          <TrashIcon size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<FolderIcon size={26} />}
              title="No documents"
              message="Attach reports or scans to this patient's record."
              action={
                <button className="doc-btn doc-btn-sm" onClick={() => setModal('document')}>
                  <PlusIcon size={15} /> Add document
                </button>
              }
            />
          )}
        </Card>
      )}

      <ConsultationModal
        open={modal === 'consultation'}
        onClose={() => setModal('')}
        busy={busy}
        onSubmit={async (payload) => {
          setBusy(true)
          const res = await createConsultation(patientId, payload)
          setBusy(false)
          if (res.success) {
            notify('Consultation recorded')
            setModal('')
            reloadAll()
          } else notify(res.message || 'Failed to save', 'error')
        }}
      />

      <PrescriptionModal
        open={modal === 'prescription'}
        onClose={() => setModal('')}
        busy={busy}
        onSubmit={async (payload) => {
          setBusy(true)
          const res = await createDoctorPrescription(patientId, payload)
          setBusy(false)
          if (res.success) {
            notify('Prescription created')
            setModal('')
            reloadAll()
          } else notify(res.message || 'Failed to save', 'error')
        }}
      />

      <LabRequestModal
        open={modal === 'labRequest'}
        onClose={() => setModal('')}
        busy={busy}
        onSubmit={async (payload) => {
          setBusy(true)
          const res = await createLabRequest(patientId, payload)
          setBusy(false)
          if (res.success) {
            notify('Lab request created')
            setModal('')
            reloadAll()
          } else notify(res.message || 'Failed to save', 'error')
        }}
      />

      <LabReportModal
        open={modal === 'labReport'}
        onClose={() => setModal('')}
        busy={busy}
        requests={byPatient.labRequests}
        onSubmit={async (payload) => {
          setBusy(true)
          const res = await createLabReport(patientId, payload)
          setBusy(false)
          if (res.success) {
            notify('Lab report added')
            setModal('')
            reloadAll()
          } else notify(res.message || 'Failed to save', 'error')
        }}
      />

      <DocumentModal
        open={modal === 'document'}
        onClose={() => setModal('')}
        busy={busy}
        onSubmit={async (payload) => {
          setBusy(true)
          const res = await createDocument(patientId, payload)
          setBusy(false)
          if (res.success) {
            notify('Document added')
            setModal('')
            reloadAll()
          } else notify(res.message || 'Failed to save', 'error')
        }}
      />

      <FollowUpModal
        open={modal === 'followUp'}
        onClose={() => setModal('')}
        busy={busy}
        onSubmit={async (payload) => {
          setBusy(true)
          const res = await createFollowUp(patientId, payload)
          setBusy(false)
          if (res.success) {
            notify('Follow-up scheduled')
            setModal('')
            reloadAll()
          } else notify(res.message || 'Failed to save', 'error')
        }}
      />

      <ConfirmDialog
        open={confirmRevoke}
        title="Revoke patient access?"
        message="You will immediately lose access to this patient's records. They can approve a new request later."
        confirmLabel="Revoke access"
        tone="danger"
        busy={busy}
        onConfirm={handleRevoke}
        onCancel={() => setConfirmRevoke(false)}
      />

      <ConfirmDialog
        open={Boolean(confirmDeleteConsult)}
        title="Delete consultation?"
        message="This consultation will be permanently removed."
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={handleDeleteConsultation}
        onCancel={() => setConfirmDeleteConsult(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmDeleteDoc)}
        title="Delete document?"
        message="This document entry will be permanently removed."
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={handleDeleteDocument}
        onCancel={() => setConfirmDeleteDoc(null)}
      />
    </>
  )
}

function Detail({ label, value }) {
  return (
    <div className="doc-detail-row">
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
    </div>
  )
}

function ShieldMini() {
  return (
    <span className="doc-timeline-dot" style={{ background: 'var(--doc-green-soft)', color: 'var(--doc-green)' }}>
      <HeartIcon size={16} />
    </span>
  )
}

// ------------------------------- modals -----------------------------------
function ConsultationModal({ open, onClose, onSubmit, busy }) {
  const [form, setForm] = useState({ title: '', symptoms: '', diagnosis: '', adviceNotes: '', consultationDate: today(), status: 'completed', hospitalName: '' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <Modal
      open={open}
      title="New Consultation"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="doc-btn doc-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="doc-btn" disabled={busy || !form.title.trim()} onClick={() => onSubmit(form)}>
            {busy ? 'Saving…' : 'Save consultation'}
          </button>
        </>
      }
    >
      <div className="doc-form-grid">
        <Field label="Title" required className="doc-field-full">
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Follow-up visit" />
        </Field>
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
        <Field label="Symptoms" className="doc-field-full">
          <textarea rows="2" value={form.symptoms} onChange={(e) => set('symptoms', e.target.value)} />
        </Field>
        <Field label="Diagnosis" className="doc-field-full">
          <textarea rows="2" value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} />
        </Field>
        <Field label="Advice / Notes" className="doc-field-full">
          <textarea rows="2" value={form.adviceNotes} onChange={(e) => set('adviceNotes', e.target.value)} />
        </Field>
        <Field label="Hospital / Clinic" className="doc-field-full">
          <input value={form.hospitalName} onChange={(e) => set('hospitalName', e.target.value)} placeholder="Optional" />
        </Field>
      </div>
    </Modal>
  )
}

function PrescriptionModal({ open, onClose, onSubmit, busy }) {
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(today())
  const [items, setItems] = useState([{ medicineName: '', dosage: '', frequency: '', duration: '' }])

  const updateItem = (index, key, value) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)))
  const addItem = () => setItems((prev) => [...prev, { medicineName: '', dosage: '', frequency: '', duration: '' }])
  const removeItem = (index) => setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))

  const valid = items.some((it) => it.medicineName.trim())

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
                diagnosis,
                notes,
                prescriptionDate: date,
                items: items.filter((it) => it.medicineName.trim()).map((it) => ({ ...it, medicineName: it.medicineName.trim() })),
              })
            }
          >
            {busy ? 'Saving…' : 'Create prescription'}
          </button>
        </>
      }
    >
      <Field label="Diagnosis">
        <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
      </Field>
      <Field label="Date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Notes">
        <textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="doc-flex-between" style={{ marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>Medicines</strong>
        <button className="doc-btn doc-btn-ghost doc-btn-sm" onClick={addItem} type="button">
          <PlusIcon size={14} /> Add
        </button>
      </div>
      {items.map((it, index) => (
        <div className="doc-grid doc-grid-4 doc-med-row" key={index}>
          <input placeholder="Medicine name" value={it.medicineName} onChange={(e) => updateItem(index, 'medicineName', e.target.value)} />
          <input placeholder="Dosage" value={it.dosage} onChange={(e) => updateItem(index, 'dosage', e.target.value)} />
          <input placeholder="Frequency" value={it.frequency} onChange={(e) => updateItem(index, 'frequency', e.target.value)} />
          <div className="doc-flex">
            <input placeholder="Duration" value={it.duration} onChange={(e) => updateItem(index, 'duration', e.target.value)} />
            <button className="doc-icon-btn" type="button" onClick={() => removeItem(index)} aria-label="Remove">
              <TrashIcon size={15} />
            </button>
          </div>
        </div>
      ))}
    </Modal>
  )
}

function LabRequestModal({ open, onClose, onSubmit, busy }) {
  const [form, setForm] = useState({ title: '', tests: '', instructions: '', priority: 'routine' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <Modal
      open={open}
      title="New Lab Request"
      onClose={onClose}
      footer={
        <>
          <button className="doc-btn doc-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="doc-btn" disabled={busy || !form.title.trim() || !form.tests.trim()} onClick={() => onSubmit(form)}>
            {busy ? 'Saving…' : 'Create request'}
          </button>
        </>
      }
    >
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

function LabReportModal({ open, onClose, onSubmit, busy, requests }) {
  const [form, setForm] = useState({ title: '', summary: '', reportText: '', labRequestId: '', reportDate: today() })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <Modal
      open={open}
      title="Add Lab Report"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="doc-btn doc-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="doc-btn" disabled={busy || !form.title.trim()} onClick={() => onSubmit({ ...form, labRequestId: form.labRequestId || undefined })}>
            {busy ? 'Saving…' : 'Add report'}
          </button>
        </>
      }
    >
      <Field label="Title" required>
        <input value={form.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Linked request">
        <select value={form.labRequestId} onChange={(e) => set('labRequestId', e.target.value)}>
          <option value="">None</option>
          {requests.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title} ({r.status})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Report date">
        <input type="date" value={form.reportDate} onChange={(e) => set('reportDate', e.target.value)} />
      </Field>
      <Field label="Summary">
        <input value={form.summary} onChange={(e) => set('summary', e.target.value)} />
      </Field>
      <Field label="Report details">
        <textarea rows="4" value={form.reportText} onChange={(e) => set('reportText', e.target.value)} />
      </Field>
    </Modal>
  )
}

function DocumentModal({ open, onClose, onSubmit, busy }) {
  const [form, setForm] = useState({ title: '', category: 'report', notes: '', fileUrl: '' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <Modal
      open={open}
      title="Add Document"
      onClose={onClose}
      footer={
        <>
          <button className="doc-btn doc-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="doc-btn" disabled={busy || !form.title.trim()} onClick={() => onSubmit(form)}>
            {busy ? 'Saving…' : 'Add document'}
          </button>
        </>
      }
    >
      <Field label="Title" required>
        <input value={form.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Category">
        <select value={form.category} onChange={(e) => set('category', e.target.value)}>
          {DOC_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </Field>
      <Field label="File URL / reference" hint="Optional link to the stored document">
        <input value={form.fileUrl} onChange={(e) => set('fileUrl', e.target.value)} />
      </Field>
      <Field label="Notes">
        <textarea rows="2" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
    </Modal>
  )
}

function FollowUpModal({ open, onClose, onSubmit, busy }) {
  const [form, setForm] = useState({ followUpDate: today(), notes: '' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <Modal
      open={open}
      title="Schedule Follow-up"
      onClose={onClose}
      footer={
        <>
          <button className="doc-btn doc-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="doc-btn" disabled={busy || !form.followUpDate} onClick={() => onSubmit(form)}>
            {busy ? 'Saving…' : 'Schedule'}
          </button>
        </>
      }
    >
      <Field label="Follow-up date" required>
        <input type="date" value={form.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} />
      </Field>
      <Field label="Notes">
        <textarea rows="2" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>
    </Modal>
  )
}

export default PatientDetail