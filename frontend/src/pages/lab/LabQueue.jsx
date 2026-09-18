import { useMemo, useState } from 'react'
import { getLabQueue, updateLabQueueStatus, createLabReportForRequest } from '../../api'
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
  Tabs,
  PageHeader,
  formatDate,
} from '../../components/doctor/ui'
import { FlaskIcon, SearchIcon, ReportIcon } from '../../components/doctor/icons'

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_OPTIONS = ['requested', 'in_progress', 'ready', 'delivered', 'cancelled']

function LabQueue() {
  const { notify } = useToast()
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [reportFor, setReportFor] = useState(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, reload } = useAsync(() => getLabQueue(), [])

  const list = useMemo(() => {
    let items = data || []
    if (tab !== 'all') items = items.filter((r) => r.status === tab)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      items = items.filter(
        (r) =>
          (r.patientName || '').toLowerCase().includes(q) ||
          (r.medicardId || '').toLowerCase().includes(q) ||
          (r.title || '').toLowerCase().includes(q) ||
          (r.tests || '').toLowerCase().includes(q)
      )
    }
    return items
  }, [data, tab, query])

  async function changeStatus(request, status) {
    setBusyId(request.id)
    const res = await updateLabQueueStatus(request.id, status)
    setBusyId(null)
    if (res.success) {
      notify('Lab request updated')
      reload()
    } else {
      notify(res.message || 'Could not update request', 'error')
    }
  }

  async function handleReport(form) {
    setBusy(true)
    const res = await createLabReportForRequest(reportFor.id, form)
    setBusy(false)
    if (res.success) {
      notify('Lab report created')
      setReportFor(null)
      reload()
    } else {
      notify(res.message || 'Could not create report', 'error')
    }
  }

  return (
    <>
      <PageHeader title="Test Queue" subtitle="Process incoming lab test requests." />

      {error && <Alert>{error}</Alert>}

      <Card>
        <div className="doc-toolbar">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
          <label className="doc-search">
            <SearchIcon size={16} />
            <input type="search" placeholder="Search patient or test" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        {loading ? (
          <Loading label="Loading test queue…" />
        ) : list.length === 0 ? (
          <EmptyState icon={<FlaskIcon size={26} />} title="No tests" message="No lab requests match this view." />
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>Patient</th>
                  <th>Test</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.requestedAt)}</td>
                    <td>
                      <strong>{r.patientName || `Patient #${r.patientId}`}</strong>
                      {r.medicardId && <div className="doc-muted" style={{ fontSize: 12.5 }}>{r.medicardId}</div>}
                    </td>
                    <td>
                      <strong>{r.title}</strong>
                      <div className="doc-muted" style={{ fontSize: 12.5 }}>{r.tests}</div>
                    </td>
                    <td><StatusBadge status={r.priority} /></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="doc-table-actions">
                      {(r.status === 'requested' || r.status === 'in_progress') && (
                        <button className="doc-btn doc-btn-sm doc-btn-success" onClick={() => setReportFor(r)}>
                          <ReportIcon size={15} /> Report
                        </button>
                      )}
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

      <ReportModal key={reportFor?.id} open={Boolean(reportFor)} request={reportFor} busy={busy} onClose={() => setReportFor(null)} onSubmit={handleReport} />
    </>
  )
}

function ReportModal({ open, request, onClose, onSubmit, busy }) {
  const [form, setForm] = useState({ title: '', summary: '', reportText: '', reportDate: '', fileUrl: '' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const title = form.title || request?.title || ''

  return (
    <Modal
      open={open}
      title={request ? `Lab report · ${request.title}` : 'Lab report'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="doc-btn doc-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="doc-btn doc-btn-success"
            disabled={busy || !title.trim()}
            onClick={() => onSubmit({ ...form, title: title.trim() })}
          >
            {busy ? 'Saving…' : 'Create report'}
          </button>
        </>
      }
    >
      {request && (
        <p className="doc-muted">
          Patient: <strong>{request.patientName || `#${request.patientId}`}</strong> · Tests: {request.tests}
        </p>
      )}
      <Field label="Report title" required>
        <input value={title} onChange={(e) => set('title', e.target.value)} placeholder={request?.title || 'e.g. CBC panel'} />
      </Field>
      <Field label="Summary">
        <input value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Short interpretation" />
      </Field>
      <Field label="Findings / report text">
        <textarea rows="5" value={form.reportText} onChange={(e) => set('reportText', e.target.value)} />
      </Field>
      <Field label="Report date">
        <input type="date" value={form.reportDate} onChange={(e) => set('reportDate', e.target.value)} />
      </Field>
      <Field label="File URL" hint="Optional. Link to an uploaded report file (e.g. /api/files/12/download).">
        <input value={form.fileUrl} onChange={(e) => set('fileUrl', e.target.value)} placeholder="/api/files/…/download" />
      </Field>
    </Modal>
  )
}

export default LabQueue
