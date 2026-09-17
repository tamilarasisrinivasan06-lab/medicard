import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { requestPatientAccess, getDoctorPatients } from '../../api'
import { useAsync, useToast, Card, Alert, PageHeader, StatusBadge } from '../../components/doctor/ui'
import { ScanIcon, SearchIcon, ShieldIcon, CheckIcon, InboxIcon } from '../../components/doctor/icons'

const MEDICARD_ID_REGEX = /^MC-[A-Z0-9]{8}$/

function DoctorScan() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [medicardId, setMedicardId] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const patients = useAsync(() => getDoctorPatients(), [])
  const authorized = patients.data || []

  const normalized = medicardId.trim().toUpperCase()
  const valid = MEDICARD_ID_REGEX.test(normalized)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!valid) {
      setError('Enter a valid MediCard ID in the format MC-XXXXXXXX.')
      return
    }
    setBusy(true)
    const res = await requestPatientAccess({ medicardId: normalized, reason: reason.trim() || undefined })
    setBusy(false)
    if (res.success) {
      setResult(res)
      notify(res.message || 'Access request sent')
      if (res.data?.status === 'accepted') {
        navigate(`/doctor/patients/${res.data.patientId}`)
      }
    } else {
      setError(res.message || 'Could not send the access request.')
    }
  }

  return (
    <>
      <PageHeader
        title="Scan Patient Card"
        subtitle="Request access to a patient's medical history. The patient must approve before any data is shared."
      />

      <div className="doc-grid doc-grid-2">
        <Card title="MediCard Lookup" subtitle="Enter the ID printed on the patient's MediCard or QR code">
          <form onSubmit={handleSubmit}>
            <label className="doc-field">
              <span className="doc-field-label">MediCard ID</span>
              <div className="doc-input-icon">
                <SearchIcon size={16} />
                <input
                  value={medicardId}
                  onChange={(e) => setMedicardId(e.target.value.toUpperCase())}
                  placeholder="MC-XXXXXXXX"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
            </label>

            <label className="doc-field">
              <span className="doc-field-label">Reason for access <span className="doc-muted">(optional)</span></span>
              <textarea rows="2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Consultation, second opinion, emergency care" />
            </label>

            {error && <Alert>{error}</Alert>}

            <button className="doc-btn doc-btn-block" type="submit" disabled={busy || !medicardId.trim()}>
              <ScanIcon size={16} /> {busy ? 'Sending request…' : 'Request access'}
            </button>
          </form>

          {result && (
            <div className="doc-mt">
              {result.data?.status === 'accepted' ? (
                <Alert tone="success">
                  <CheckIcon size={16} /> You already have active access to this patient.
                </Alert>
              ) : result.data?.status === 'pending' ? (
                <Alert tone="info">
                  <InboxIcon size={16} /> Request sent. It is now pending the patient's approval.
                </Alert>
              ) : (
                <Alert tone="info">{result.message}</Alert>
              )}
            </div>
          )}
        </Card>

        <Card title="How patient access works" subtitle="Your access is always patient-controlled">
          <ol className="doc-steps">
            <li>
              <span className="doc-step-num">1</span>
              <div>
                <strong>Scan or enter the MediCard ID</strong>
                <p>The patient's unique ID links to their profile. You cannot browse patients without it.</p>
              </div>
            </li>
            <li>
              <span className="doc-step-num">2</span>
              <div>
                <strong>The patient approves your request</strong>
                <p>They see your name, specialization and reason, then accept or reject.</p>
              </div>
            </li>
            <li>
              <span className="doc-step-num">3</span>
              <div>
                <strong>Time-limited, revocable access</strong>
                <p>Access lasts 24 hours and can be revoked by the patient at any time. Every access is audit-logged.</p>
              </div>
            </li>
          </ol>

          <div className="doc-note doc-flex" style={{ gap: 8, marginTop: 8 }}>
            <ShieldIcon size={16} />
            All access to patient data is logged for compliance.
          </div>

          <Link className="doc-btn doc-btn-ghost doc-btn-block doc-mt" to="/doctor/access-requests">
            View my access requests
          </Link>
        </Card>

        <Card title={`Currently authorized patients (${authorized.length})`} className="doc-span-2">
          {authorized.length ? (
            <div className="doc-chip-list">
              {authorized.map((p) => (
                <Link className="doc-chip" key={p.patientId} to={`/doctor/patients/${p.patientId}`}>
                  <span>
                    <strong>{p.patientName}</strong>
                    <span className="doc-code">{p.medicardId}</span>
                  </span>
                  <StatusBadge status="accepted" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="doc-muted">No authorized patients yet. Request access using a patient's MediCard ID above.</p>
          )}
        </Card>
      </div>
    </>
  )
}

export default DoctorScan