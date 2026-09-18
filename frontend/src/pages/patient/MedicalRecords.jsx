import { useState } from 'react'
import { getPatientPortalRecords, getPatientPortalDocuments } from '../../api'
import { Card, Loading, Alert, EmptyState, Tabs, FileLink, useAsync, formatDate, statusLabel } from '../../components/doctor/ui'
import { FolderIcon, ReportIcon } from '../../components/doctor/icons'

const TABS = [
  { value: 'records', label: 'Medical records' },
  { value: 'documents', label: 'Documents' },
]

function MedicalRecords() {
  const [tab, setTab] = useState('records')
  const records = useAsync(() => getPatientPortalRecords(), [])
  const documents = useAsync(() => getPatientPortalDocuments(), [])

  const loading = records.loading || documents.loading
  const error = records.error || documents.error

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>Medical Records</h1>
          <p>Every record and document stored against your profile.</p>
        </div>
      </header>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {loading && <Loading label="Loading records…" />}
      {error && <Alert>{error}</Alert>}

      {tab === 'records' && records.data && (
        records.data.length ? (
          <Card>
            <div className="doc-row-list">
              {records.data.map((r) => (
                <div key={r.id} className="doc-row-item">
                  <span className="doc-activity-icon">
                    <ReportIcon size={18} />
                  </span>
                  <div className="doc-row-main">
                    <strong>{r.title}</strong>
                    <span className="doc-tag">{statusLabel(r.recordType)}</span>{' '}
                    {r.description || r.diagnosis || ''}
                    <span className="doc-muted">
                      {formatDate(r.recordDate)}
                      {r.doctorName ? ` · ${r.doctorName}` : ''}
                      {r.hospitalName ? ` · ${r.hospitalName}` : ''}
                    </span>
                  </div>
                  {r.fileUrl && <FileLink url={r.fileUrl}>Open</FileLink>}
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <EmptyState icon={<FolderIcon size={28} />} title="No records" message="Records added by healthcare providers will appear here." />
        )
      )}

      {tab === 'documents' && documents.data && (
        documents.data.length ? (
          <Card>
            <div className="doc-row-list">
              {documents.data.map((doc) => (
                <div key={doc.id} className="doc-row-item">
                  <span className="doc-activity-icon">
                    <FolderIcon size={18} />
                  </span>
                  <div className="doc-row-main">
                    <strong>{doc.title}</strong>
                    <span>
                      <span className="doc-tag">{statusLabel(doc.category)}</span> {doc.notes || ''}
                    </span>
                    <span className="doc-muted">
                      {formatDate(doc.createdAt)}
                      {doc.doctorName ? ` · ${doc.doctorName}` : ''}
                    </span>
                  </div>
                  {doc.fileUrl && <FileLink url={doc.fileUrl}>Open</FileLink>}
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <EmptyState icon={<FolderIcon size={28} />} title="No documents" message="Documents shared with you will appear here." />
        )
      )}
    </div>
  )
}

export default MedicalRecords
