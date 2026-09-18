import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getDashboard, getToken } from '../api'

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(typeof value === 'string' && value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

function PatientDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    getDashboard()
      .then((result) => {
        if (result.success) {
          setData(result.data)
        } else if (
          result.message === 'Invalid or expired token' ||
          result.message === 'Authentication required' ||
          result.message === 'Session expired. Please log in again.'
        ) {
          localStorage.removeItem('token')
          localStorage.removeItem('role')
          navigate('/login')
        } else {
          setError(result.message || 'Failed to load dashboard')
        }
      })
      .catch(() => setError('Could not reach the backend. Is it running?'))
      .finally(() => setLoading(false))
  }, [navigate])

  if (!getToken()) return null

  return (
    <div className="medicard-view">
      <h2>Patient Dashboard</h2>

      {loading && <p className="medicard-status">Loading…</p>}
      {error && <p className="auth-error">{error}</p>}

      {data && (
        <>
          <p className="medicard-status">Welcome, {data.profile.name}</p>
          <p className="medicard-description">MediCard ID: {data.profile.medicardId}</p>

          <div className="stat-cards">
            <div className="stat-card">
              <strong>{data.recordCount}</strong>
              <span>Medical records</span>
            </div>
            <div className="stat-card">
              <strong>{data.medicationCount}</strong>
              <span>Medications</span>
            </div>
            <div className="stat-card">
              <strong>{data.appointments.length}</strong>
              <span>Appointments</span>
            </div>
            <div className="stat-card">
              <strong>{data.allergies.length}</strong>
              <span>Allergies</span>
            </div>
          </div>

          {data.recentRecords.length > 0 && (
            <div className="portal-section">
              <h3>Recent records</h3>
              <div className="record-list">
                {data.recentRecords.map((record) => (
                  <div className="record-card" key={record.id}>
                    <div className="record-meta">
                      <strong>{formatDate(record.recordDate)}</strong>
                      <span className="badge">{record.recordType}</span>
                    </div>
                    <p><strong>{record.title}</strong></p>
                    {record.doctorName && <p><strong>Doctor:</strong> {record.doctorName}</p>}
                    {record.diagnosis && <p><strong>Diagnosis:</strong> {record.diagnosis}</p>}
                  </div>
                ))}
              </div>
              <nav className="portal-nav">
                <Link to="/patient/medical-history">View all records</Link>
              </nav>
            </div>
          )}

          {data.medications.length > 0 && (
            <div className="portal-section">
              <h3>Current medications</h3>
              <div className="record-list">
                {data.medications.map((med) => (
                  <div className="record-card" key={med.id}>
                    <p><strong>{med.medicineName}</strong></p>
                    {med.dosage && <p>Dosage: {med.dosage}</p>}
                    {med.frequency && <p>Frequency: {med.frequency}</p>}
                  </div>
                ))}
              </div>
              <nav className="portal-nav">
                <Link to="/patient/medications">Manage medications</Link>
              </nav>
            </div>
          )}

          {data.appointments.length > 0 && (
            <div className="portal-section">
              <h3>Appointments</h3>
              <div className="record-list">
                {data.appointments.map((appt) => (
                  <div className="record-card" key={appt.id}>
                    <div className="record-meta">
                      <strong>{formatDate(appt.appointmentDate)}</strong>
                      <span className="badge">{appt.status}</span>
                    </div>
                    <p><strong>Doctor:</strong> {appt.doctorName || '—'}</p>
                    <p><strong>Hospital:</strong> {appt.hospitalName || '—'}</p>
                    {appt.reason && <p>Reason: {appt.reason}</p>}
                  </div>
                ))}
              </div>
              <nav className="portal-nav">
                <Link to="/patient/appointments">Manage appointments</Link>
              </nav>
            </div>
          )}

          {data.allergies.length > 0 && (
            <div className="portal-section">
              <h3>Allergies</h3>
              <p className="medicard-description">
                {data.allergies.map((a) => `${a.allergen}${a.severity ? ` (${a.severity})` : ''}`).join(', ')}
              </p>
            </div>
          )}

          {data.emergencyContacts.length > 0 && (
            <div className="portal-section">
              <h3>Emergency contacts</h3>
              <div className="record-list">
                {data.emergencyContacts.map((c) => (
                  <div className="record-card" key={c.id}>
                    <p><strong>{c.name}</strong> {c.relationship ? `(${c.relationship})` : ''}</p>
                    {c.phone && <p>Phone: {c.phone}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <nav className="portal-nav">
            <Link to="/medicard">My MediCard</Link>
            <Link to="/patient/medical-history">Medical History</Link>
            <Link to="/patient/medications">Medications</Link>
            <Link to="/patient/appointments">Appointments</Link>
            <Link to="/patient/profile">Profile</Link>
          </nav>
        </>
      )}
    </div>
  )
}

export default PatientDashboard