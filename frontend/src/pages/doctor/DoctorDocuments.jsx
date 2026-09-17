import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoctorDocuments, getDoctorPatients, createDocument, deleteDocument } from '../../api'
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
import { FolderIcon, PlusIcon, TrashIcon, SearchIcon } from '../../components/doctor/icons'

const CATEGORIES = ['report', 'scan', 'prescription', 'discharge_summary', 'insurance', 'other']

function DoctorDocuments() {
  const { notify } = useToast()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data, loading, error, reload } = useAsync(() => getDoctorDocuments(), [])
  const patients = useAsync(() => getDoctorPatients(), [])

  const list = useMemo(() => {
    const items = data || []
    if (!query.trim()) return items
    const q = query.trim().toLowerCase()
    return items.filter((d) => (d.patientName || '').toLowerCase().includes(q) || (d.title || '').toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q))
  }, [data, query])

  async function handleCreate(form) {
    setBusy(true)
    const { patientId, ...payload } = form
    const res = await createDocument(patientId, payload)
    setBusy(false)
    if (res.success) {
      notify('Document added')
      setOpen(false)
      reload()
    } else {
      notify(res.message || 'Could not add document', 'error')
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setBusy(true)
    const res = await deleteDocument(confirmDelete.id)
    setBusy(false)
    setConfirmDelete(null)
    if (res.success) {
      notify('Document deleted')
      reload()
    } else {
      notify(res.message || 'Could not delete document', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Medical Documents"
        subtitle="Reports, scans and files you have attached to patient records."
        actions={
          <button className="doc-btn" onClick={() => setOpen(true)} disabled={!patients.data?.length}>
            <PlusIcon size={16} /> Add document
          </button>
        }
      />

      {error && <Alert>{error}</Alert>}

      <Card
        title={`${list.length} document${list.length === 1 ? '' : 's'}`}
        actions={
          <label className="doc-search">
            <SearchIcon size={16} />
            <input type="search" placeholder="Search patient, title, category" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        }
      >
        {loading ? (
          <Loading label="Loading documents…" />
        ) : list.length === 0 ? (
          <EmptyState icon={<FolderIcon size={26} />} title="No documents" message="Documents you add will appear here." />
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Patient</th>
                  <th>Category</th>
                  <th>Notes</th>
                  <th>Added</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.title}</strong>
                      {d.fileUrl && (
                        <div>
                          <a className="doc-link" href={d.fileUrl} target="_blank" rel="noreferrer">Open file</a>
                        </div>
                      )}
                    </td>
                    <td>{d.patientName || `Patient #${d.patientId}`}</td>
                    <td><StatusBadge status={d.category} /></td>
                    <td>{d.notes || <span className="doc-muted">—</span>}</td>
                    <td>{formatDate(d.createdAt)}</td>
                    <td className="doc-table-actions">
                      <Link className="doc-btn doc-btn-ghost doc-btn-sm" to={`/doctor/patients/${d.patientId}`}>
                        Open
                      </Link>
                      <button className="doc-btn doc-btn-ghost doc-btn-sm" onClick={() => setConfirmDelete(d)}>
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

      <NewDocumentModal open={open} onClose={() => setOpen(false)} patients={patients.data || []} busy={busy} onSubmit={handleCreate} />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete document?"
        message="This document entry will be permanently removed."
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  )
}

function NewDocumentModal({ open, onClose, onSubmit, busy, patients }) {
  const [form, setForm] = useState({ patientId: '', title: '', category: 'report', notes: '', fileUrl: '' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Modal
      open={open}
      title="Add Document"
      onClose={onClose}
      footer={
        <>
          <button className="doc-btn doc-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="doc-btn" disabled={busy || !form.patientId || !form.title.trim()} onClick={() => onSubmit(form)}>
            {busy ? 'Saving…' : 'Add document'}
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
        <input value={form.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Category">
        <select value={form.category} onChange={(e) => set('category', e.target.value)}>
          {CATEGORIES.map((c) => (
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

export default DoctorDocuments