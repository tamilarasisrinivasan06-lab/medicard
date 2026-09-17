import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getMyDoctorAccess, decideDoctorAccess, getToken } from '../api'

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Approved' },
  { value: 'rejected', label: 'Declined' },
  { value: 'revoked', label: 'Revoked' },
  { value: 'expired', label: 'Expired' },
]

function PatientDoctorAccess() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState(null)

  function load(status) {
    setLoading(true)
    getMyDoctorAccess(status === 'all' ? undefined : status)
      .then((result) => result.success && setRequests(result.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }
    // oxlint-disable-next-line react/set-state-in-effect -- kick off the initial fetch for the active tab
    load(filter)
  }, [navigate, filter])

  if (!getToken()) return null

  async function decide(request, decision) {
    setBusyId(request.id)
    setError('')
    setMessage('')
    const result = await decideDoctorAccess(request.id, decision)
    setBusyId(null)
    if (result.success) {
      setMessage(result.message || 'Request updated')
      load(filter)
    } else {
      setError(result.message || 'Could not update request')
    }
  }

  const pending = requests.filter((r) => r.status === 'pending')

  return (
    <div className="medicard-view">
      <h2>Doctor Access Requests</h2>
      <p className="medicard-status">
        Doctors must ask your permission before viewing your medical records. Approved access lasts 24 hours and you can
        revoke it by contacting the doctor or waiting for it to expire.
      </p>

      {pending.length > 0 && (
        <p className="auth-success">
          You have {pending.length} pending request{pending.length === 1 ? '' : 's'} awaiting your decision.
        </p>
      )}
      {error && <p className="auth-error">{error}</p>}
      {message && <p className="auth-success">{message}</p>}

      <div className="portal-section">
        <div className="portal-nav" style={{ marginBottom: 12 }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={filter === f.value ? 'badge' : ''}
              style={{ cursor: 'pointer', border: 'none', background: filter === f.value ? undefined : 'transparent' }}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && <p className="medicard-status">Loading…</p>}
        {!loading && requests.length === 0 && <p className="medicard-status">No access requests found.</p>}

        {!loading && requests.length > 0 && (
          <div className="record-list">
            {requests.map((r) => (
              <div className="record-card" key={r.id}>
                <div className="record-meta">
                  <strong>{r.doctorName || `Doctor #${r.doctorId}`}</strong>
                  <span className="badge">{r.status}</span>
                </div>
                <p><strong>Specialization:</strong> {r.specialization || '—'}</p>
                <p><strong>Hospital:</strong> {r.hospitalName || '—'}</p>
                <p><strong>Your MediCard:</strong> {r.medicardId || '—'}</p>
                {r.reason && <p><strong>Reason:</strong> {r.reason}</p>}
                <p><strong>Requested:</strong> {formatDateTime(r.requestedAt)}</p>
                {r.decidedAt && <p><strong>Decided:</strong> {formatDateTime(r.decidedAt)}</p>}
                {r.status === 'accepted' && <p><strong>Access expires:</strong> {formatDateTime(r.expiresAt)}</p>}

                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="button" disabled={busyId === r.id} onClick={() => decide(r, 'accept')}>
                      Approve access
                    </button>
                    <button type="button" disabled={busyId === r.id} onClick={() => decide(r, 'reject')}>
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="portal-nav">
        <Link to="/patient/dashboard">Back to Dashboard</Link>
        <Link to="/patient/medical-history">Medical History</Link>
      </nav>
    </div>
  )
}

export default PatientDoctorAccess