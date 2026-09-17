import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  getMyProfile,
  getMyMedications,
  addMedication,
  deleteMedication,
  getToken,
} from '../api'

function formatDate(value) {
  if (!value) return null
  const d = new Date(typeof value === 'string' && value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

function PatientMedications() {
  const navigate = useNavigate()
  const [patientId, setPatientId] = useState(null)
  const [medications, setMedications] = useState([])
  const [form, setForm] = useState({
    medicineName: '',
    dosage: '',
    frequency: '',
    duration: '',
    startDate: '',
    endDate: '',
    instructions: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    getMyProfile()
      .then((result) => {
        if (result.success) setPatientId(result.data.id)
        else setError(result.message || 'Failed to load profile')
      })
      .catch(() => setError('Could not reach the backend. Is it running?'))

    getMyMedications()
      .then((result) => {
        if (result.success) setMedications(result.data)
        else setError(result.message || 'Failed to load medications')
      })
      .catch(() => setError('Could not reach the backend. Is it running?'))
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
    if (!patientId) {
      setError('Profile not loaded yet. Try again.')
      return
    }
    const payload = { patientId, medicineName: form.medicineName }
    for (const key of ['dosage', 'frequency', 'duration', 'startDate', 'endDate', 'instructions']) {
      if (form[key] !== '') payload[key] = form[key]
    }
    const result = await addMedication(payload)
    if (result.success) {
      setMedications((prev) => [result.data, ...prev])
      setForm({ medicineName: '', dosage: '', frequency: '', duration: '', startDate: '', endDate: '', instructions: '' })
      setMessage(result.message || 'Medication added')
    } else {
      setError(result.message || 'Failed to add medication')
    }
  }

  async function handleDelete(id) {
    const result = await deleteMedication(id)
    if (result.success) setMedications((prev) => prev.filter((m) => m.id !== id))
    else setError(result.message || 'Failed to remove medication')
  }

  return (
    <div className="medicard-view">
      <h2>My Medications</h2>

      {loading && <p className="medicard-status">Loading…</p>}
      {error && <p className="auth-error">{error}</p>}
      {message && <p className="auth-success">{message}</p>}

      {medications.length === 0 && !loading && (
        <p className="medicard-status">No medications recorded.</p>
      )}

      {medications.length > 0 && (
        <div className="record-list">
          {medications.map((med) => (
            <div className="record-card" key={med.id}>
              <p><strong>{med.medicineName}</strong></p>
              {med.dosage && <p>Dosage: {med.dosage}</p>}
              {med.frequency && <p>Frequency: {med.frequency}</p>}
              {med.duration && <p>Duration: {med.duration}</p>}
              {formatDate(med.startDate) && (
                <p>Start: {formatDate(med.startDate)}{formatDate(med.endDate) ? ` · End: ${formatDate(med.endDate)}` : ''}</p>
              )}
              {med.instructions && <p>Instructions: {med.instructions}</p>}
              {med.prescribedBy && <p>Prescribed by: {med.prescribedBy}</p>}
              <button onClick={() => handleDelete(med.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <div className="portal-section">
        <h3>Add medication</h3>
        <form className="auth-form consultation-form" onSubmit={handleAdd}>
          <label>
            Medicine name <span className="required">*</span>
            <input type="text" name="medicineName" value={form.medicineName} onChange={handleChange} required />
          </label>
          <label>
            Dosage
            <input type="text" name="dosage" value={form.dosage} onChange={handleChange} placeholder="e.g. 500 mg" />
          </label>
          <label>
            Frequency
            <input type="text" name="frequency" value={form.frequency} onChange={handleChange} placeholder="e.g. Twice daily" />
          </label>
          <label>
            Duration
            <input type="text" name="duration" value={form.duration} onChange={handleChange} placeholder="e.g. 5 days" />
          </label>
          <label>
            Start date
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} />
          </label>
          <label>
            End date
            <input type="date" name="endDate" value={form.endDate} onChange={handleChange} />
          </label>
          <label>
            Instructions
            <textarea rows="2" name="instructions" value={form.instructions} onChange={handleChange} placeholder="Optional" />
          </label>
          <button type="submit">Add medication</button>
        </form>
      </div>

      <nav className="portal-nav">
        <Link to="/patient/dashboard">Back to Dashboard</Link>
      </nav>
    </div>
  )
}

export default PatientMedications