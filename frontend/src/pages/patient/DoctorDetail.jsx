import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPatientPortalDoctor } from '../../api'
import {
  Card,
  StatCard,
  Loading,
  Alert,
  EmptyState,
  StatusBadge,
  Tabs,
  useAsync,
  formatDate,
  statusLabel,
} from '../../components/doctor/ui'
import {
  StethoscopeIcon,
  PillIcon,
  FlaskIcon,
  ReportIcon,
  FolderIcon,
  ClockIcon,
} from '../../components/doctor/icons'

const TABS = [
  { value: 'consultations', label: 'Consultations' },
  { value: 'prescriptions', label: 'Prescriptions' },
  { value: 'labs', label: 'Lab tests' },
  { value: 'documents', label: 'Documents' },
]

function DoctorDetail() {
  const { doctorId } = useParams()
  const [tab, setTab] = useState('consultations')
  const { data, loading, error } = useAsync(() => getPatientPortalDoctor(doctorId), [doctorId])

  if (loading) return <Loading label="Loading doctor…" />
  if (error) return <Alert>{error}</Alert>
  if (!data) return null

  const { doctor, stats, access } = data

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>{doctor.name}</h1>
          <p>
            {doctor.specialization || 'Doctor'}
            {doctor.hospitalName ? ` · ${doctor.hospitalName}` : ''}
          </p>
        </div>
        <div className="doc-page-actions">
          <Link to="/patient/doctors" className="doc-btn doc-btn-ghost">
            Back
          </Link>
        </div>
      </header>

      <div className="doc-grid doc-grid-2">
        <Card title="Profile">
          <div className="doc-detail-grid">
            <div className="doc-detail-row">
              <span>Specialisation</span>
              <strong>{doctor.specialization || '—'}</strong>
            </div>
            <div className="doc-detail-row">
              <span>Qualification</span>
              <strong>{doctor.qualification || '—'}</strong>
            </div>
            <div className="doc-detail-row">
              <span>Experience</span>
              <strong>{doctor.experience != null ? `${doctor.experience} years` : '—'}</strong>
            </div>
            <div className="doc-detail-row">
              <span>Hospital</span>
              <strong>{doctor.hospitalName || '—'}</strong>
            </div>
            <div className="doc-detail-row">
              <span>Consultation fee</span>
              <strong>{doctor.consultationFee != null ? `₹${doctor.consultationFee}` : '—'}</strong>
            </div>
            <div className="doc-detail-row">
              <span>Access status</span>
              <strong>{access ? <StatusBadge status={access.status} /> : 'Not granted'}</strong>
            </div>
          </div>
        </Card>

        <div className="doc-stats doc-stats-2">
          <StatCard icon={<StethoscopeIcon size={20} />} label="Consultations" value={stats.consultations} tone="accent" />
          <StatCard icon={<PillIcon size={20} />} label="Prescriptions" value={stats.prescriptions} tone="amber" />
          <StatCard icon={<FlaskIcon size={20} />} label="Lab requests" value={stats.labRequests} tone="green" />
          <StatCard icon={<ReportIcon size={20} />} label="Lab reports" value={stats.labReports} tone="red" />
        </div>
      </div>

      <Card
        title="Care history with this doctor"
        actions={<Tabs tabs={TABS} active={tab} onChange={setTab} />}
      >
        {tab === 'consultations' && (
          data.consultations.length ? (
            <div className="doc-row-list">
              {data.consultations.map((c) => (
                <div key={c.id} className="doc-row-item">
                  <span className="doc-activity-icon">
                    <StethoscopeIcon size={18} />
                  </span>
                  <div className="doc-row-main">
                    <strong>{c.title}</strong>
                    <span>{c.diagnosis || 'No diagnosis recorded'}</span>
                    <span className="doc-muted">
                      {formatDate(c.consultationDate)}
                      {c.hospitalName ? ` · ${c.hospitalName}` : ''}
                    </span>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<StethoscopeIcon size={28} />} title="No consultations" />
          )
        )}

        {tab === 'prescriptions' && (
          data.prescriptions.length ? (
            <div className="doc-row-list">
              {data.prescriptions.map((p) => (
                <div key={p.id} className="doc-row-item">
                  <span className="doc-activity-icon">
                    <PillIcon size={18} />
                  </span>
                  <div className="doc-row-main">
                    <strong>{p.diagnosis || 'Prescription'}</strong>
                    <span>
                      {p.itemCount} medicine{p.itemCount === 1 ? '' : 's'} · {formatDate(p.prescriptionDate)}
                    </span>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<PillIcon size={28} />} title="No prescriptions" />
          )
        )}

        {tab === 'labs' && (
          <>
            {data.labRequests.length ? (
              <div className="doc-row-list">
                {data.labRequests.map((l) => (
                  <div key={l.id} className="doc-row-item">
                    <span className="doc-activity-icon">
                      <FlaskIcon size={18} />
                    </span>
                    <div className="doc-row-main">
                      <strong>{l.title}</strong>
                      <span>{l.tests}</span>
                      <span className="doc-muted">
                        {formatDate(l.requestedAt)} · {statusLabel(l.priority)} priority
                      </span>
                    </div>
                    <StatusBadge status={l.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<FlaskIcon size={28} />} title="No lab requests" />
            )}
            {data.labReports.length > 0 && (
              <div className="doc-row-list">
                {data.labReports.map((r) => (
                  <div key={r.id} className="doc-row-item">
                    <span className="doc-activity-icon">
                      <ReportIcon size={18} />
                    </span>
                    <div className="doc-row-main">
                      <strong>{r.title}</strong>
                      <span>{r.summary || 'Report available'}</span>
                    </div>
                    <span className="doc-muted">{formatDate(r.reportDate)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'documents' && (
          data.documents.length ? (
            <div className="doc-row-list">
              {data.documents.map((doc) => (
                <div key={doc.id} className="doc-row-item">
                  <span className="doc-activity-icon">
                    <FolderIcon size={18} />
                  </span>
                  <div className="doc-row-main">
                    <strong>{doc.title}</strong>
                    <span>
                      {statusLabel(doc.category)} · {formatDate(doc.createdAt)}
                    </span>
                  </div>
                  <ClockIcon size={16} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<FolderIcon size={28} />} title="No documents" />
          )
        )}
      </Card>
    </div>
  )
}

export default DoctorDetail
