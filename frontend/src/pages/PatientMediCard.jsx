import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyMedicard, getToken, getRole } from '../api'

function PatientMediCard() {
  const navigate = useNavigate()
  const hasToken = Boolean(getToken())
  const isPatient = getRole() === 'patient'
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasToken) {
      navigate('/login')
      return
    }

    getMyMedicard()
      .then((result) => {
        if (result.success) {
          setData(result.data)
        } else if (result.message === 'Invalid or expired token' || result.message === 'Authentication required') {
          localStorage.removeItem('token')
          localStorage.removeItem('role')
          navigate('/login')
        } else {
          setError(result.message || 'Failed to load MediCard')
        }
      })
      .catch(() => setError('Could not reach the backend. Is it running?'))
      .finally(() => setLoading(false))
  }, [navigate, hasToken])

  if (!hasToken) return null

  return (
    <div className="medicard-view">
      <h2>My MediCard</h2>

      {!isPatient && <p className="auth-error">Only patients have a MediCard.</p>}
      {isPatient && loading && <p className="medicard-status">Loading…</p>}
      {isPatient && error && <p className="auth-error">{error}</p>}

      {isPatient && data && (
        <>
          <p className="medicard-status">Patient: {data.name}</p>
          <p className="medicard-description">MediCard ID: {data.medicardId}</p>
          {data.qrDataUrl && <img src={data.qrDataUrl} alt="MediCard QR code" className="qr-image" />}
          <p className="medicard-description">Show this QR code to an authorized healthcare provider.</p>
        </>
      )}
    </div>
  )
}

export default PatientMediCard