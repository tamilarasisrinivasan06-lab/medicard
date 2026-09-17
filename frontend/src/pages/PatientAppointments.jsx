import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  getMyAppointments,
  createAppointment,
  cancelAppointment,
  listDoctors,
  listHospitals,
  getToken,
} from '../api'

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(typeof value === 'string' && value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

function PatientAppointments() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [hospitals, setHospitals] = useState([])
  const [form, setForm] = useState({
    doctorId: '',
    hospitalId: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
    notes: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    getMyAppointments()
      .then((result) => result.success && setAppointments(result.data))
      .catch(() => {})

    listDoctors()
      .then((result) => result.success && setDoctors(result.data))
      .catch(() => {})

    listHospitals()
      .then((result) => result.success && setHospitals(result.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [navigate])

  if (!getToken()) return null

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    const payload = {}
    for (const key of ['doctorId', 'hospitalId']) {
      if (form[key] !== '') payload[key] = Number(form[key])
    }
    for (const key of ['appointmentDate', 'appointmentTime', 'reason', 'notes']) {
      if (form[key] !== '') payload[key] = form[key]
    }
    const result = await createAppointment(payload)
    if (result.success) {
      setAppointments((prev) => [result.data, ...prev])
      setForm({ doctorId: '', hospitalId: '', appointmentDate: '', appointmentTime: '', reason: '', notes: '' })
      setMessage(result.message || 'Appointment scheduled')
    } else {
      setError(result.message || 'Failed to schedule appointment')
    }
  }

  async function handleCancel(id) {
    const result = await cancelAppointment(id)
    if (result.success) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? result.data : a)))
      setMessage(result.message || 'Appointment cancelled')
    } else {
      setError(result.message || 'Failed to cancel appointment')
    }
  }

  return (
    <div className="medicard-view">
      <h2>My Appointments</h2>

      {loading && <p className="medicard-status">Loading…</p>}
      {error && <p className="auth-error">{error}</p>}
      {message && <p className="auth-success">{message}</p>}

      {appointments.length === 0 && !loading && (
        <p className="medicard-status">No appointments yet.</p>
      )}

      {appointments.length > 0 && (
        <div className="record-list">
          {appointments.map((appt) => (
            <div className="record-card" key={appt.id}>
              <div className="record-meta">
                <strong>{formatDate(appt.appointmentDate)}{appt.appointmentTime ? ` ${appt.appointmentTime}` : ''}</strong>
                <span className="badge">{appt.status}</span>
              </div>
              <p><strong>Doctor:</strong> {appt.doctorName || '—'}</p>
              <p><strong>Hospital:</strong> {appt.hospitalName || '—'}</p>
              {appt.reason && <p>Reason: {appt.reason}</p>}
              {appt.status !== 'cancelled' && appt.status !== 'completed' && appt.status !== 'no_show' && (
                <button onClick={() => handleCancel(appt.id)}>Cancel appointment</button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="portal-section">
        <h3>Schedule appointment</h3>
        <form className="auth-form consultation-form" onSubmit={handleAdd}>
          <label>
            Doctor
            <select name="doctorId" value={form.doctorId} onChange={handleChange}>
              <option value="">—</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.specialization ? ` (${d.specialization})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label>
            Hospital
            <select name="hospitalId" value={form.hospitalId} onChange={handleChange}>
              <option value="">—</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </label>

          <label>
            Date <span className="required">*</span>
            <input
              type="date"
              name="appointmentDate"
              value={form.appointmentDate}
              onChange={handleChange}
              min={new Date().toISOString().slice(0, 10)}
              required
            />
          </label>

          <label>
            Time
            <input type="time" name="appointmentTime" value={form.appointmentTime} onChange={handleChange} />
          </label>

          <label>
            Reason
            <input type="text" name="reason" maxLength={500} value={form.reason} onChange={handleChange} placeholder="Optional" />
          </label>

          <label>
            Notes
            <textarea rows="2" name="notes" maxLength={2000} value={form.notes} onChange={handleChange} placeholder="Optional" />
          </label>

          <button type="submit">Schedule appointment</button>
        </form>
      </div>

      <nav className="portal-nav">
        <Link to="/patient/dashboard">Back to Dashboard</Link>
      </nav>
    </div>
  )
}

export default PatientAppointments