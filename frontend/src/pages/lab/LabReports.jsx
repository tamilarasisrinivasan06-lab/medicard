import { useMemo, useState } from 'react'
import { getLabPortalReports, getLabPortalPatients, uploadLabScanReport } from '../../api'
import {
  useAsync,
  useToast,
  Card,
  Loading,
  Alert,
  EmptyState,
  PageHeader,
  FileLink,
  Modal,
  Field,
  formatDate,
  MAX_UPLOAD_BYTES,
} from '../../components/doctor/ui'
import { ReportIcon, SearchIcon, ScanIcon } from '../../components/doctor/icons'

const SCAN_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const SCAN_UPLOAD_ACCEPT = '.jpg,.jpeg,.png,.pdf'

function LabReports() {
  const [query, setQuery] = useState('')
  const [showScan, setShowScan] = useState(false)
  const { data, loading, error, reload } = useAsync(() => getLabPortalReports(), [])

  const list = useMemo(() => {
    let items = data || []
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      items = items.filter(
        (r) =>
          (r.patientName || '').toLowerCase().includes(q) ||
          (r.medicardId || '').toLowerCase().includes(q) ||
          (r.title || '').toLowerCase().includes(q)
      )
    }
    return items
  }, [data, query])

  return (
    <>
      <PageHeader
        title="Lab Reports"
        subtitle="Reports uploaded by your lab."
        actions={
          <button className="doc-btn" onClick={() => setShowScan(true)}>
            <ScanIcon size={16} /> Add Scan Report
          </button>
        }
      />

      {error && <Alert>{error}</Alert>}

      <Card>
        <div className="doc-toolbar">
          <span />
          <label className="doc-search">
            <SearchIcon size={16} />
            <input type="search" placeholder="Search patient or report" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        {loading ? (
          <Loading label="Loading reports…" />
        ) : list.length === 0 ? (
          <EmptyState icon={<ReportIcon size={26} />} title="No reports" message="Reports you create for lab requests will appear here." />
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Report</th>
                  <th>Summary</th>
                  <th aria-label="File" />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.reportDate)}</td>
                    <td>
                      <strong>{r.patientName || `Patient #${r.patientId}`}</strong>
                      {r.medicardId && <div className="doc-muted" style={{ fontSize: 12.5 }}>{r.medicardId}</div>}
                    </td>
                    <td>
                      <strong>{r.title}</strong>
                      {r.labRequestTitle && <div className="doc-muted" style={{ fontSize: 12.5 }}>Request: {r.labRequestTitle}</div>}
                    </td>
                    <td>{r.summary || '—'}</td>
                    <td>{r.fileUrl ? <FileLink url={r.fileUrl} /> : <span className="doc-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showScan && (
        <ScanReportModal
          open
          onClose={() => setShowScan(false)}
          onUploaded={() => {
            setShowScan(false)
            reload()
          }}
        />
      )}
    </>
  )
}

function ScanReportModal({ open, onClose, onUploaded }) {
  const { notify } = useToast()
  const [patientSearch, setPatientSearch] = useState('')
  const [patientId, setPatientId] = useState('')
  const [title, setTitle] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [busy, setBusy] = useState(false)

  const authorized = useAsync(
    () => getLabPortalPatients(patientSearch.trim() || undefined),
    [patientSearch]
  )

  const candidates = useMemo(() => {
    const all = authorized.data || []
    if (!patientSearch.trim()) return all
    const q = patientSearch.trim().toLowerCase()
    return all.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.medicardId || '').toLowerCase().includes(q)
    )
  }, [authorized.data, patientSearch])

  function pickFile(e) {
    const f = e.target.files?.[0] || null
    setFile(f)
    setFileError('')
    if (!f) return
    if (!SCAN_UPLOAD_TYPES.includes(f.type)) {
      setFileError('Only JPG, PNG or PDF scan files are accepted')
      setFile(null)
      return
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setFileError(`File exceeds the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB size limit`)
      setFile(null)
    }
  }

  const canSubmit = Boolean(patientId && file) && !busy

  async function handleSubmit() {
    setBusy(true)
    const formData = new FormData()
    formData.append('patientId', patientId)
    formData.append('title', title.trim())
    if (reportDate) formData.append('reportDate', reportDate)
    if (notes.trim()) formData.append('notes', notes.trim())
    formData.append('file', file)
    const res = await uploadLabScanReport(formData)
    setBusy(false)
    if (res.success) {
      notify('Scan report uploaded')
      onUploaded()
    } else {
      notify(res.message || 'Could not upload the scan', 'error')
    }
  }

  return (
    <Modal
      open={open}
      title="Add Scan Report"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="doc-btn doc-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="doc-btn" disabled={!canSubmit} onClick={handleSubmit}>
            {busy ? 'Uploading…' : 'Upload scan report'}
          </button>
        </>
      }
    >
      <p className="doc-muted">
        Upload a scanned PDF, JPG or PNG report. Select a patient who has an active lab request at your lab.
      </p>

      {authorized.loading ? (
        <Loading label="Loading authorized patients…" />
      ) : candidates.length === 0 ? (
        <Alert>
          {patientSearch.trim()
            ? 'No patients match this search.'
            : 'No authorized patients found. Lab requests must exist for a patient before you can upload their report.'}
        </Alert>
      ) : (
        <>
          <Field label="Patient" required hint="Search by name or MediCard ID.">
            <div className="doc-stack" style={{ gap: 8 }}>
              <label className="doc-search">
                <SearchIcon size={16} />
                <input
                  type="search"
                  placeholder="Search patient name or MediCard ID"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
              </label>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                <option value="">Select patient…</option>
                {candidates.map((p) => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.name || `Patient #${p.patientId}`} · {p.medicardId || '—'}
                  </option>
                ))}
              </select>
            </div>
          </Field>
        </>
      )}

      <Field label="Scan file" required hint={`Accepted formats: ${SCAN_UPLOAD_ACCEPT}`}>
        <input type="file" accept={SCAN_UPLOAD_ACCEPT} onChange={pickFile} />
        {fileError ? (
          <div style={{ marginTop: 6 }}>
            <Alert>{fileError}</Alert>
          </div>
        ) : file ? (
          <span className="doc-muted" style={{ fontSize: 12.5 }}>{file.name} ({Math.round(file.size / 1024)} KB)</span>
        ) : null}
      </Field>

      <Field label="Report title" hint="Defaults to the linked lab request title if empty.">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. X-Ray Chest Scan" />
      </Field>

      <div className="doc-grid doc-grid-2">
        <Field label="Report date">
          <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Notes / findings">
        <textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Short interpretation or notes for the patient" />
      </Field>
    </Modal>
  )
}

export default LabReports