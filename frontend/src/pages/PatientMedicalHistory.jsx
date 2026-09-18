import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getMyRecords, uploadMedicalFile, getToken } from '../api'
import FileLink from '../components/FileLink'

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(typeof value === 'string' && value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

function PatientMedicalHistory() {
  const navigate = useNavigate()
  const [records, setRecords] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    getMyRecords()
      .then((result) => {
        if (result.success) {
          setRecords(result.data)
        } else if (
          result.message === 'Invalid or expired token' ||
          result.message === 'Authentication required' ||
          result.message === 'Session expired. Please log in again.'
        ) {
          localStorage.removeItem('token')
          localStorage.removeItem('role')
          navigate('/login')
        } else {
          setError(result.message || 'Failed to load medical history')
        }
      })
      .catch(() => setError('Could not reach the backend. Is it running?'))
      .finally(() => setLoading(false))
  }, [navigate])

  if (!getToken()) return null

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setUploadMsg('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadMedicalFile(formData)
      if (result.success) {
        setUploadMsg(`Uploaded: ${result.data.originalName}`)
        setFile(null)
      } else {
        setUploadMsg('')
        setError(result.message || 'Upload failed')
      }
    } catch {
      setError('Could not reach the backend. Is it running?')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="medicard-view">
      <h2>Medical History</h2>

      {loading && <p className="medicard-status">Loading…</p>}
      {error && <p className="auth-error">{error}</p>}

      {records && records.length === 0 && (
        <p className="medicard-status">No medical records yet.</p>
      )}

      {records && records.length > 0 && (
        <div className="record-list">
          {records.map((record) => (
            <div className="record-card" key={record.id}>
              <div className="record-meta">
                <strong>{formatDate(record.recordDate)}</strong>
                <span className="badge">{record.recordType}</span>
              </div>
              <p><strong>{record.title}</strong></p>
              {record.description && <p>{record.description}</p>}
              {record.diagnosis && <p><strong>Diagnosis:</strong> {record.diagnosis}</p>}
              {record.doctorName && <p><strong>Doctor:</strong> {record.doctorName}</p>}
              {record.hospitalName && <p><strong>Hospital:</strong> {record.hospitalName}</p>}
              {record.hasFile && record.fileUrl && (
                <p>
                  <FileLink url={record.fileUrl} />
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="portal-section">
        <h3>Upload a document</h3>
        <form className="auth-form" onSubmit={handleUpload}>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
          <button type="submit" disabled={uploading || !file}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
        {uploadMsg && <p className="auth-success">{uploadMsg}</p>}
      </div>

      <nav className="portal-nav">
        <Link to="/patient/dashboard">Back to Dashboard</Link>
      </nav>
    </div>
  )
}

export default PatientMedicalHistory