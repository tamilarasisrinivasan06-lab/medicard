import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoctorAppointments, updateDoctorAppointmentStatus } from '../../api'
import { useAsync, useToast, Card, Loading, Alert, EmptyState, StatusBadge, StatCard, PageHeader, formatDate } from '../../components/doctor/ui'
import { CalendarIcon, ClockIcon, PatientsIcon } from '../../components/doctor/icons'

const STATUS_OPTIONS = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function isoDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function DoctorAppointments() {
  const { notify } = useToast()
  const [filter, setFilter] = useState('all')
  const [busyId, setBusyId] = useState(null)
  const { data, loading, error, reload } = useAsync(() => getDoctorAppointments(), [])
  const appointments = useMemo(() => data || [], [data])

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return appointments.filter((a) => {
      if (filter === 'today') return isoDate(a.appointmentDate) === today
      if (filter === 'upcoming') return isoDate(a.appointmentDate) >= today && ['scheduled', 'confirmed'].includes(a.status)
      if (filter === 'completed') return a.status === 'completed'
      if (filter === 'cancelled') return ['cancelled', 'no_show'].includes(a.status)
      return true
    })
  }, [appointments, filter])

  async function changeStatus(appointment, status) {
    setBusyId(appointment.id)
    const res = await updateDoctorAppointmentStatus(appointment.id, status)
    setBusyId(null)
    if (res.success) {
      notify(`Appointment marked ${status.replace('_', ' ')}`)
      reload()
    } else {
      notify(res.message || 'Could not update appointment', 'error')
    }
  }

  const counts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      total: appointments.length,
      today: appointments.filter((a) => isoDate(a.appointmentDate) === today).length,
      upcoming: appointments.filter((a) => isoDate(a.appointmentDate) >= today && ['scheduled', 'confirmed'].includes(a.status)).length,
    }
  }, [appointments])

  return (
    <>
      <PageHeader title="Appointments" subtitle="Manage your scheduled patient visits." />

      <div className="doc-stats doc-stats-3">
        <StatCard icon={<CalendarIcon size={22} />} label="Total appointments" value={counts.total} />
        <StatCard icon={<ClockIcon size={22} />} label="Today" value={counts.today} tone="amber" />
        <StatCard icon={<PatientsIcon size={22} />} label="Upcoming" value={counts.upcoming} tone="green" />
      </div>

      {error && <Alert>{error}</Alert>}

      <Card>
        <div className="doc-filter-row">
          {FILTERS.map((f) => (
            <button key={f.value} className={`doc-chip-btn${filter === f.value ? ' is-active' : ''}`} onClick={() => setFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading label="Loading appointments…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon size={26} />}
            title="No appointments"
            message={filter === 'all' ? 'You have no appointments assigned to you yet.' : `No ${filter} appointments.`}
          />
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>MediCard</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{formatDate(a.appointmentDate)}</strong></td>
                    <td>{a.appointmentTime || <span className="doc-muted">—</span>}</td>
                    <td>
                      {a.patientName || `Patient #${a.patientId}`}
                      {a.hospitalName && <div className="doc-muted" style={{ fontSize: 12.5 }}>{a.hospitalName}</div>}
                    </td>
                    <td>{a.medicardId ? <span className="doc-code">{a.medicardId}</span> : <span className="doc-muted">—</span>}</td>
                    <td>{a.reason || <span className="doc-muted">—</span>}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="doc-table-actions">
                      {a.patientName && (
                        <select
                          className="doc-select-sm"
                          value={a.status}
                          disabled={busyId === a.id}
                          onChange={(e) => changeStatus(a, e.target.value)}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="doc-muted doc-mt">
        Need to review a patient? Open them from <Link to="/doctor/patients">My Patients</Link> or request access via{' '}
        <Link to="/doctor/scan">Scan Patient Card</Link>.
      </p>
    </>
  )
}

export default DoctorAppointments