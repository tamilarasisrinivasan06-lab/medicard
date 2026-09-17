import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  getDoctorStats,
  searchMedicard,
  requestMedicardAccess,
  verifyMedicard,
  getToken,
  getRole,
  setSavedAccess,
} from '../api'

function DoctorPortal() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [step, setStep] = useState('search')
  const [medicardId, setMedicardId] = useState('')
  const [patient, setPatient] = useState(null)
  const [verification, setVerification] = useState(null)
  const [otp, setOtp] = useState('')
  const [granted, setGranted] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (getRole() !== 'doctor') {
      navigate('/login')
      return
    }
    if (!getToken()) {
      navigate('/login')
      return
    }

    getDoctorStats()
      .then((result) => {
        if (result.success) setStats(result.data)
        else setError(result.message || 'Failed to load statistics')
      })
      .catch(() => setError('Could not reach the backend. Is it running?'))
  }, [navigate])

  if (getRole() !== 'doctor') return null

  async function handleSearch(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setPatient(null)
    setVerification(null)
    setGranted(null)
    setStep('searching')

    const result = await searchMedicard(medicardId)
    if (result.success) {
      setPatient(result.data)
      setStep('patient')
    } else {
      setError(result.message || 'MediCard not found')
      setStep('search')
    }
  }

  async function handleRequestAccess() {
    setError('')
    setMessage('')
    setVerification(null)

    const result = await requestMedicardAccess(patient.medicardId)
    if (result.success) {
      setVerification(result)
      setStep('verify')
    } else {
      setError(result.message || 'Could not request access')
    }
  }

  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    const result = await verifyMedicard(verification.verificationId, otp)
    if (result.success) {
      setGranted(result.data)
      setSavedAccess(result.data)
      setStep('granted')
    } else {
      setError(result.message || 'Verification failed')
    }
  }

  function reset() {
    setMedicardId('')
    setPatient(null)
    setVerification(null)
    setGranted(null)
    setOtp('')
    setError('')
    setMessage('')
    setStep('search')
  }

  return (
    <div className="medicard-view">
      <h2>Doctor Portal</h2>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="auth-success">{message}</p>}

      {stats && (
        <div className="stat-cards">
          <div className="stat-card">
            <strong>{stats.totalConsultations}</strong>
            <span>Total consultations</span>
          </div>
          <div className="stat-card">
            <strong>{stats.todayConsultations}</strong>
            <span>Today</span>
          </div>
        </div>
      )}

      <div className="portal-section">
        <h3>Find a patient by MediCard ID</h3>
        <form onSubmit={handleSearch} className="auth-form">
          <input
            type="text"
            placeholder="MC-XXXXXXXX"
            value={medicardId}
            onChange={(e) => setMedicardId(e.target.value)}
            required
          />
          <button type="submit" disabled={step === 'searching'}>Search</button>
        </form>
      </div>

      {step === 'verify' && verification && (
        <div className="portal-section">
          <p className="medicard-status">
            Verification required for {verification.patientName || verification.medicardId}
          </p>
          {verification.devOtp && <p className="auth-success">Dev OTP: {verification.devOtp}</p>}
          <form onSubmit={handleVerify} className="auth-form">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <button type="submit">Verify</button>
          </form>
        </div>
      )}

      {step === 'granted' && granted && (
        <div className="portal-section">
          <p className="auth-success">Access granted to {granted.patientName || granted.medicardId}</p>
          <p className="medicard-description">
            Expires {new Date(granted.expiresAt).toLocaleString()}
          </p>
          <nav className="portal-nav">
            <Link to={`/doctor/patient/${granted.patientId}/records`}>View patient records</Link>
            <Link to="/doctor/consultation/new">Add consultation</Link>
          </nav>
          <button onClick={reset} className="secondary-button">Search another patient</button>
        </div>
      )}

      {step === 'patient' && patient && (
        <div className="portal-section">
          <p className="medicard-status">
            {patient.patientName || 'Patient'} — {patient.medicardId}
          </p>
          <button onClick={handleRequestAccess}>Request access</button>
        </div>
      )}

      {stats?.recentConsultations?.length > 0 && (
        <div className="portal-section">
          <h3>Recent consultations</h3>
          <div className="record-list">
            {stats.recentConsultations.map((record) => (
              <div className="record-card" key={record.id}>
                <div className="record-meta">
                  <strong>{new Date(String(record.recordDate).slice(0, 10)).toLocaleDateString()}</strong>
                  <span className="badge">{record.recordType}</span>
                </div>
                <p><strong>Patient:</strong> {record.medicardId || '—'}</p>
                <p><strong>{record.title}</strong></p>
                {record.diagnosis && <p><strong>Diagnosis:</strong> {record.diagnosis}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DoctorPortal