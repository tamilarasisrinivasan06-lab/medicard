import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getPatientRecords, getSavedAccess, getToken, getRole, clearSavedAccess } from '../api'

function DoctorPatientRecords() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const [access] = useState(() => getSavedAccess())
  const [records, setRecords] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const accessValid = access && access.accessToken && access.patientId === patientId

  useEffect(() => {
    if (getRole() !== 'doctor' || !getToken()) {
      navigate('/doctor')
      return
    }
    if (!accessValid) return

    getPatientRecords(patientId, access.accessToken)
      .then((result) => {
        if (result.success) {
          setRecords(result.data)
        } else {
          clearSavedAccess()
          setError(result.message || 'Failed to load records')
        }
      })
      .catch(() => setError('Could not reach the backend. Is it running?'))
      .finally(() => setLoading(false))
  }, [patientId, navigate, access, accessValid])

  if (getRole() !== 'doctor' || !getToken()) return null

  if (!accessValid) {
    return (
      <div className="medicard-view">
        <h2>Patient Records</h2>
        <p className="auth-error">
          No active access for this patient. Verify the MediCard again from the Doctor Portal.
        </p>
        <nav className="portal-nav">
          <Link to="/doctor/dashboard">Go to Doctor Portal</Link>
        </nav>
      </div>
    )
  }

  return (
    <div className="medicard-view">
      <h2>Patient Records</h2>
      <p className="medicard-description">
        {access.patientName || access.medicardId || 'Patient'}
      </p>

      {loading && <p className="medicard-status">Loading…</p>}
      {error && <p className="auth-error">{error}</p>}

      {!loading && !error && records && records.length === 0 && (
        <p className="medicard-status">No medical records for this patient.</p>
      )}

      {records && records.length > 0 && (
        <div className="record-list">
          {records.map((record) => (
            <div className="record-card" key={record.id}>
              <div className="record-meta">
                <strong>{new Date(String(record.recordDate).slice(0, 10)).toLocaleDateString()}</strong>
                <span className="badge">{record.recordType}</span>
              </div>
              <p><strong>{record.title}</strong></p>
              {record.description && <p>{record.description}</p>}
              {record.diagnosis && <p><strong>Diagnosis:</strong> {record.diagnosis}</p>}
              {record.doctorName && <p><strong>Doctor:</strong> {record.doctorName}</p>}
              {record.hospitalName && <p><strong>Hospital:</strong> {record.hospitalName}</p>}
              {record.hasFile && record.fileUrl && (
                <p>
                  <a href={`http://localhost:5000${record.fileUrl}`} target="_blank" rel="noreferrer">
                    View attachment
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <nav className="portal-nav">
        <Link to="/doctor/dashboard">Back to Doctor Portal</Link>
        <Link to="/doctor/consultation/new">Add consultation</Link>
      </nav>
    </div>
  )
}

export default DoctorPatientRecords