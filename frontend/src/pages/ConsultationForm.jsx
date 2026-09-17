import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createMedicalRecord, getSavedAccess, getToken, getRole } from '../api'

const RECORD_TYPES = ['prescription', 'lab_report', 'scan', 'diagnosis', 'discharge_summary', 'vaccination', 'other']

function ConsultationForm() {
  const navigate = useNavigate()
  const access = getSavedAccess()
  const [form, setForm] = useState({
    recordDate: '',
    recordType: 'diagnosis',
    title: '',
    description: '',
    diagnosis: '',
    hospitalName: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (getRole() !== 'doctor' || !getToken() || !access || !access.accessToken) {
    return (
      <div className="medicard-view">
        <h2>New Consultation</h2>
        <p className="auth-error">
          No active access. Verify a patient's MediCard first from the Doctor Portal.
        </p>
        <nav className="portal-nav">
          <button onClick={() => navigate('/doctor')}>Go to Doctor Portal</button>
        </nav>
      </div>
    )
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const payload = {
        patientId: access.patientId,
        recordType: form.recordType,
        title: form.title,
        description: form.description || null,
        diagnosis: form.diagnosis,
        hospitalName: form.hospitalName || null,
      }
      if (form.recordDate) payload.recordDate = new Date(form.recordDate).toISOString()

      const result = await createMedicalRecord(payload, access.accessToken)
      if (result.success) {
        navigate(`/doctor/patient/${access.patientId}/records`)
      } else {
        setError(result.message || 'Failed to create medical record')
      }
    } catch {
      setError('Could not reach the backend. Is it running?')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="medicard-view">
      <h2>New Consultation</h2>
      <p className="medicard-description">
        Patient: {access.patientName || access.medicardId || '—'}
      </p>

      {error && <p className="auth-error">{error}</p>}

      <form onSubmit={handleSubmit} className="auth-form consultation-form">
        <label>
          Record date
          <input
            type="date"
            value={form.recordDate}
            onChange={(e) => updateField('recordDate', e.target.value)}
          />
        </label>

        <label>
          Record type
          <select value={form.recordType} onChange={(e) => updateField('recordType', e.target.value)}>
            {RECORD_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label>
          Title <span className="required">*</span>
          <input
            type="text"
            maxLength={500}
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            required
          />
        </label>

        <label>
          Description
          <textarea
            rows="3"
            maxLength={2000}
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Optional"
          />
        </label>

        <label>
          Diagnosis <span className="required">*</span>
          <textarea
            rows="3"
            maxLength={2000}
            value={form.diagnosis}
            onChange={(e) => updateField('diagnosis', e.target.value)}
            required
          />
        </label>

        <label>
          Hospital / Clinic
          <input
            type="text"
            maxLength={500}
            value={form.hospitalName}
            onChange={(e) => updateField('hospitalName', e.target.value)}
            placeholder="Optional"
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save medical record'}
        </button>
      </form>
    </div>
  )
}

export default ConsultationForm