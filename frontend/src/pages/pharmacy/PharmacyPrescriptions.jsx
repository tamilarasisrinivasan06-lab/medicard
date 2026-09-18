import { useMemo, useState } from 'react'
import { getPharmacyPrescriptions, getPharmacyPrescription, dispensePrescription } from '../../api'
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
  PageHeader,
  Tabs,
  formatDate,
} from '../../components/doctor/ui'
import { PillIcon, SearchIcon, CheckIcon } from '../../components/doctor/icons'

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'dispensed', label: 'Dispensed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All' },
]

function PharmacyPrescriptions({ defaultStatus = 'pending' }) {
  const { notify } = useToast()
  const [tab, setTab] = useState(defaultStatus)
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, reload } = useAsync(() => getPharmacyPrescriptions(), [])

  const list = useMemo(() => {
    let items = data || []
    if (tab !== 'all') items = items.filter((p) => p.status === tab)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      items = items.filter(
        (p) =>
          (p.patientName || '').toLowerCase().includes(q) ||
          (p.medicardId || '').toLowerCase().includes(q) ||
          (p.doctorName || '').toLowerCase().includes(q) ||
          (p.diagnosis || '').toLowerCase().includes(q)
      )
    }
    return items
  }, [data, tab, query])

  async function openDetail(prescription) {
    setDetailLoading(true)
    setDetail({ ...prescription, items: [] })
    const res = await getPharmacyPrescription(prescription.id)
    setDetailLoading(false)
    if (res.success) setDetail(res.data)
    else notify(res.message || 'Could not load prescription', 'error')
  }

  async function handleDispense() {
    if (!detail) return
    setBusy(true)
    const res = await dispensePrescription(detail.id)
    setBusy(false)
    setConfirming(false)
    if (res.success) {
      notify('Prescription dispensed')
      setDetail(null)
      reload()
    } else {
      notify(res.message || 'Could not dispense prescription', 'error')
    }
  }

  return (
    <>
      <PageHeader title="Prescription Queue" subtitle="Review and dispense prescriptions for your hospital." />

      {error && <Alert>{error}</Alert>}

      <Card>
        <div className="doc-toolbar">
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
          <label className="doc-search">
            <SearchIcon size={16} />
            <input type="search" placeholder="Search patient, doctor or diagnosis" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        {loading ? (
          <Loading label="Loading prescriptions…" />
        ) : list.length === 0 ? (
          <EmptyState icon={<PillIcon size={26} />} title="Nothing here" message="No prescriptions match this view." />
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Diagnosis</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.prescriptionDate)}</td>
                    <td>
                      <strong>{p.patientName || `Patient #${p.patientId}`}</strong>
                      {p.medicardId && <div className="doc-muted" style={{ fontSize: 12.5 }}>{p.medicardId}</div>}
                    </td>
                    <td>{p.doctorName || '—'}</td>
                    <td>{p.diagnosis || '—'}</td>
                    <td>{p.itemCount ?? 0}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="doc-table-actions">
                      <button className="doc-btn doc-btn-ghost doc-btn-sm" onClick={() => openDetail(p)}>
                        {p.status === 'pending' ? 'Review' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(detail)}
        title={detail ? `Prescription #${detail.id}` : 'Prescription'}
        onClose={() => setDetail(null)}
        size="lg"
        footer={
          detail?.status === 'pending' ? (
            <>
              <button className="doc-btn doc-btn-ghost" onClick={() => setDetail(null)} disabled={busy}>Close</button>
              <button className="doc-btn doc-btn-success" onClick={() => setConfirming(true)} disabled={busy || detailLoading}>
                <CheckIcon size={16} /> Dispense
              </button>
            </>
          ) : (
            <button className="doc-btn doc-btn-ghost" onClick={() => setDetail(null)}>Close</button>
          )
        }
      >
        {detail && (
          <div>
            <div className="doc-detail-grid">
              <div className="doc-detail-row"><span>Patient</span><strong>{detail.patientName || `#${detail.patientId}`}</strong></div>
              <div className="doc-detail-row"><span>MediCard</span><strong>{detail.medicardId || '—'}</strong></div>
              <div className="doc-detail-row"><span>Doctor</span><strong>{detail.doctorName || '—'}</strong></div>
              <div className="doc-detail-row"><span>Hospital</span><strong>{detail.hospitalName || '—'}</strong></div>
              <div className="doc-detail-row"><span>Date</span><strong>{formatDate(detail.prescriptionDate)}</strong></div>
              <div className="doc-detail-row"><span>Status</span><StatusBadge status={detail.status} /></div>
            </div>
            {detail.diagnosis && <p className="doc-muted" style={{ marginTop: 12 }}><strong>Diagnosis:</strong> {detail.diagnosis}</p>}
            {detail.notes && <p className="doc-muted"><strong>Notes:</strong> {detail.notes}</p>}

            {detailLoading ? (
              <Loading label="Loading medicines…" />
            ) : (
              <div className="doc-table-wrap">
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
                    {(detail.items || []).map((it) => (
                      <tr key={it.id}>
                        <td><strong>{it.medicineName}</strong></td>
                        <td>{it.dosage || '—'}</td>
                        <td>{it.frequency || '—'}</td>
                        <td>{it.duration || '—'}</td>
                        <td>{it.instructions || '—'}</td>
                      </tr>
                    ))}
                    {(detail.items || []).length === 0 && (
                      <tr><td colSpan={5} className="doc-muted">No medicines recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirming}
        title="Dispense prescription?"
        message={`Mark prescription #${detail?.id} as dispensed? This will notify the patient.`}
        confirmLabel="Dispense"
        tone="success"
        busy={busy}
        onConfirm={handleDispense}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}

export default PharmacyPrescriptions
