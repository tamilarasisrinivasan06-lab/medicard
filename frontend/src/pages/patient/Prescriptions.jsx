import { useState } from 'react'
import { getMyPrescriptions } from '../../api'
import { Card, Loading, Alert, EmptyState, Modal, useAsync, formatDate } from '../../components/doctor/ui'
import { PillIcon } from '../../components/doctor/icons'

function Prescriptions() {
  const { data, loading, error } = useAsync(() => getMyPrescriptions(), [])
  const [selected, setSelected] = useState(null)

  if (loading) return <Loading label="Loading prescriptions…" />
  if (error) return <Alert>{error}</Alert>

  const list = data || []

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>Prescriptions</h1>
          <p>Medicines prescribed to you by your doctors.</p>
        </div>
      </header>

      {list.length === 0 ? (
        <EmptyState icon={<PillIcon size={28} />} title="No prescriptions" message="Prescriptions from your doctors will appear here." />
      ) : (
        <Card>
          <div className="doc-row-list">
            {list.map((p) => (
              <div key={p.id} className="doc-row-item">
                <span className="doc-activity-icon">
                  <PillIcon size={18} />
                </span>
                <div className="doc-row-main">
                  <strong>{p.diagnosis || 'Prescription'}</strong>
                  <span>
                    {p.items?.length || 0} medicine{p.items?.length === 1 ? '' : 's'}
                    {p.doctorName ? ` · ${p.doctorName}` : ''}
                  </span>
                  <span className="doc-muted">{formatDate(p.prescriptionDate)}</span>
                </div>
                <button type="button" className="doc-btn doc-btn-sm doc-btn-ghost" onClick={() => setSelected(p)}>
                  View
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={Boolean(selected)} title="Prescription" onClose={() => setSelected(null)} size="md">
        {selected && (
          <div className="doc-grid">
            <div className="doc-detail-grid">
              <div className="doc-detail-row">
                <span>Date</span>
                <strong>{formatDate(selected.prescriptionDate)}</strong>
              </div>
              <div className="doc-detail-row">
                <span>Prescribed by</span>
                <strong>{selected.doctorName ? `${selected.doctorName}` : '—'}</strong>
              </div>
              <div className="doc-detail-row">
                <span>Diagnosis</span>
                <strong>{selected.diagnosis || '—'}</strong>
              </div>
            </div>
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.items || []).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.medicineName}</strong>
                        {item.instructions && <div className="doc-muted">{item.instructions}</div>}
                      </td>
                      <td>{item.dosage || '—'}</td>
                      <td>{item.frequency || '—'}</td>
                      <td>{item.duration || '—'}</td>
                    </tr>
                  ))}
                  {(!selected.items || selected.items.length === 0) && (
                    <tr>
                      <td colSpan={4} className="doc-muted">
                        No medicine items recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {selected.notes && <p className="doc-muted">Notes: {selected.notes}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Prescriptions
