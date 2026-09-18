import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoctorLabReports, getDoctorLabRequests, getDoctorPatients, createLabReport, uploadPatientFile } from '../../api'
import {
  useAsync,
  useToast,
  Card,
  Loading,
  Alert,
  EmptyState,
  Modal,
  Field,
  FileLink,
  PageHeader,
  formatDate,
  UPLOAD_ACCEPT,
  validateUpload,
} from '../../components/doctor/ui'
import { ReportIcon, PlusIcon, SearchIcon } from '../../components/doctor/icons'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function DoctorLabReports() {
  const { notify } = useToast()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, reload } = useAsync(() => getDoctorLabReports(), [])
  const patients = useAsync(() => getDoctorPatients(), [])
  const labRequests = useAsync(() => getDoctorLabRequests(), [])

  const list = useMemo(() => {
    const items = data || []
    if (!query.trim()) return items
    const q = query.trim().toLowerCase()
    return items.filter((r) => (r.patientName || '').toLowerCase().includes(q) || (r.title || '').toLowerCase().includes(q) || (r.summary || '').toLowerCase().includes(q))
  }, [data, query])

  async function handleCreate(form) {
    setBusy(true)
    const { patientId, file, ...payload } = form
    let fileUrl
    if (file) {
      const upload = await uploadPatientFile(patientId, file)
      if (!upload.success) {
        setBusy(false)
        notify(upload.message || 'File upload failed', 'error')
        return
      }
      fileUrl = upload.data.url
    }
    const res = await createLabReport(patientId, { ...payload, fileUrl })
    setBusy(false)
    if (res.success) {
      notify('Lab report added')
      setOpen(false)
      reload()
      labRequests.reload()
    } else {
      notify(res.message || 'Could not add report', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Lab Reports"
        subtitle="Results you have recorded for your patients."
        actions={
          <button className="doc-btn" onClick={() => setOpen(true)} disabled={!patients.data?.length}>
            <PlusIcon size={16} /> Add lab report
          </button>
        }
      />

      {error && <Alert>{error}</Alert>}

      <Card
        title={`${list.length} report${list.length === 1 ? '' : 's'}`}
        actions={
          <label className="doc-search">
            <SearchIcon size={16} />
            <input type="search" placeholder="Search patient, title, summary" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        }
      >
        {loading ? (
          <Loading label="Loading lab reports…" />
        ) : list.length === 0 ? (
          <EmptyState icon={<ReportIcon size={26} />} title="No lab reports" message="Add results once a patient's tests are completed." />
        ) : (
          <div className="doc-stack">
            {list.map((r) => (
              <div className="doc-card" key={r.id}>
                <div className="doc-flex-between">
                  <div>
                    <strong>{r.title}</strong>
                    <div className="doc-note">
                      {r.patientName || `Patient #${r.patientId}`} · {formatDate(r.reportDate)}
                      {r.labRequestId ? ` · Request #${r.labRequestId}` : ''}
                    </div>
                  </div>
                  <Link className="doc-btn doc-btn-ghost doc-btn-sm" to={`/doctor/patients/${r.patientId}`}>
                    Open patient
                  </Link>
                </div>
                {r.summary && <p style={{ marginTop: 10 }}>{r.summary}</p>}
                {r.reportText && <p className="doc-note" style={{ whiteSpace: 'pre-wrap' }}>{r.reportText}</p>}
                {r.fileUrl && <FileLink url={r.fileUrl}>View attached file</FileLink>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <NewLabReportModal
        open={open}
        onClose={() => setOpen(false)}
        patients={patients.data || []}
        labRequests={labRequests.data || []}
        busy={busy}
        onSubmit={handleCreate}
      />
    </>
  )
}

function NewLabReportModal({ open, onClose, onSubmit, busy, patients, labRequests }) {
  const [form, setForm] = useState({ patientId: '', labRequestId: '', title: '', summary: '', reportText: '', file: null, reportDate: today() })
  const [fileError, setFileError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  function handleFile(e) {
    const file = e.target.files?.[0] || null
    const error = validateUpload(file)
    setFileError(error)
    set('file', error ? null : file)
  }

  const patientRequests = useMemo(
    () => labRequests.filter((r) => String(r.patientId) === String(form.patientId)),
    [labRequests, form.patientId]
  )

  return (
    <Modal
      open={open}
      title="Add Lab Report"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="doc-btn doc-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="doc-btn" disabled={busy || !form.patientId || !form.title.trim() || Boolean(fileError)} onClick={() => onSubmit({ ...form, labRequestId: form.labRequestId || undefined })}>
            {busy ? 'Saving…' : 'Add report'}
          </button>
        </>
      }
    >
      <Field label="Patient" required>
        <select value={form.patientId} onChange={(e) => { set('patientId', e.target.value); set('labRequestId', '') }}>
          <option value="">Select an authorized patient…</option>
          {patients.map((p) => (
            <option key={p.patientId} value={p.patientId}>
              {p.patientName} · {p.medicardId}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Linked lab request" hint="Optional — marks the request as ready when linked">
        <select value={form.labRequestId} onChange={(e) => set('labRequestId', e.target.value)} disabled={!form.patientId}>
          <option value="">None</option>
          {patientRequests.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title} ({r.status})
            </option>
          ))}
        </select>
      </Field>
      <div className="doc-grid doc-grid-2">
        <Field label="Report date">
          <input type="date" value={form.reportDate} onChange={(e) => set('reportDate', e.target.value)} />
        </Field>
        <Field label="Title" required>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
      </div>
      <Field label="Summary">
        <input value={form.summary} onChange={(e) => set('summary', e.target.value)} />
      </Field>
      <Field label="Report details">
        <textarea rows="4" value={form.reportText} onChange={(e) => set('reportText', e.target.value)} />
      </Field>
      <Field label="Attach file" hint="JPG, PNG, WEBP, GIF, PDF, TXT, CSV, DOC(X), XLS(X) · up to 10 MB">
        <input type="file" accept={UPLOAD_ACCEPT} onChange={handleFile} />
      </Field>
      {fileError && <Alert>{fileError}</Alert>}
    </Modal>
  )
}

export default DoctorLabReports