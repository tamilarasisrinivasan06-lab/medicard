import { useState } from 'react'
import { getPatientPortalTimeline } from '../../api'
import { Card, Loading, Alert, EmptyState, useAsync, formatDate } from '../../components/doctor/ui'
import {
  StethoscopeIcon,
  PillIcon,
  FlaskIcon,
  FolderIcon,
  CalendarIcon,
  ClockIcon,
} from '../../components/doctor/icons'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'consultation', label: 'Consultations' },
  { value: 'prescription', label: 'Prescriptions' },
  { value: 'lab_report', label: 'Lab reports' },
  { value: 'record', label: 'Records' },
  { value: 'appointment', label: 'Appointments' },
]

const ACTIVITY_ICON = {
  consultation: StethoscopeIcon,
  prescription: PillIcon,
  lab_report: FlaskIcon,
  record: FolderIcon,
  appointment: CalendarIcon,
}

const ACTIVITY_LABEL = {
  consultation: 'Consultation',
  prescription: 'Prescription',
  lab_report: 'Lab report',
  record: 'Medical record',
  appointment: 'Appointment',
}

function MedicalHistory() {
  const [filter, setFilter] = useState('')
  const { data, loading, error } = useAsync(() => getPatientPortalTimeline(filter), [filter])

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>Medical History</h1>
          <p>A chronological timeline of your care.</p>
        </div>
      </header>

      <div className="doc-filter-row">
        {FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            type="button"
            className={`doc-chip-btn ${filter === f.value ? 'is-active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <Loading label="Loading history…" />}
      {error && <Alert>{error}</Alert>}

      {data && data.length === 0 && (
        <EmptyState icon={<ClockIcon size={28} />} title="No history yet" message="Your care timeline will build up here." />
      )}

      {data && data.length > 0 && (
        <Card>
          <div className="doc-timeline">
            {data.map((item) => {
              const Icon = ACTIVITY_ICON[item.type] || FolderIcon
              return (
                <div className="doc-timeline-item" key={`${item.type}-${item.id}`}>
                  <span className="doc-timeline-dot" />
                  <div className="doc-timeline-body">
                    <div className="doc-timeline-head">
                      <strong>{item.title}</strong>
                      <span className="doc-timeline-date">{formatDate(item.date)}</span>
                    </div>
                    <p>
                      <span className="doc-tag">
                        <Icon size={13} /> {ACTIVITY_LABEL[item.type] || 'Record'}
                      </span>{' '}
                      {item.subtitle || ''}
                    </p>
                    {(item.doctorName || item.hospitalName) && (
                      <p className="doc-muted">
                        {[item.doctorName ? `${item.doctorName}` : null, item.hospitalName].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

export default MedicalHistory
