import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link, useOutletContext } from 'react-router-dom'
import { lookupPatient, requestPatientAccess, getDoctorPatients } from '../../api'
import { useAsync, useToast, Card, Alert, PageHeader, StatusBadge, Modal, Field, Loading } from '../../components/doctor/ui'
import { ScanIcon, SearchIcon, ShieldIcon, UserIcon, CloseIcon } from '../../components/doctor/icons'

const MEDICARD_ID_REGEX = /^MC-[A-Z0-9]{8}$/

function DoctorScan() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { profile } = useOutletContext()

  const [mode, setMode] = useState('code') // 'code' | 'qr'
  const [medicardId, setMedicardId] = useState('')
  const [reason, setReason] = useState('')
  const [found, setFound] = useState(null)
  const [sending, setSending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // QR scanner lifecycle
  const [scanError, setScanError] = useState('')
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef(null)
  const readerIdRef = useRef(null)

  const patients = useAsync(() => getDoctorPatients(), [])
  const authorized = patients.data || []

  const normalized = medicardId.trim().toUpperCase()
  const valid = MEDICARD_ID_REGEX.test(normalized)

  // Stop the camera when unmounting or switching mode
  async function stopScanner() {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (!scanner) return
    try {
      await scanner.stop()
      scanner.clear()
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    return () => {
      stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (mode !== 'qr') {
      stopScanner()
      setScanning(false)
      setScanError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  async function startScanner() {
    setScanError('')
    setFound(null)
    setScanning(true)
    const { Html5Qrcode } = await import('html5-qrcode')
    const readerId = `doc-qr-reader-${Date.now()}`
    readerIdRef.current = readerId
    const scanner = new Html5Qrcode(readerId)
    scannerRef.current = scanner

    const onSuccess = async (decodedText) => {
      const text = String(decodedText || '').trim()
      if (!text) return
      await stopScanner()
      setScanning(false)
      if (MEDICARD_ID_REGEX.test(text.toUpperCase())) {
        await doLookup({ medicardId: text.toUpperCase() })
      } else {
        await doLookup({ qrPayload: text })
      }
    }

    const onError = (err) => {
      // Ignore continuous scan frame errors, surface camera failures.
      if (String(err && err.name || '').includes('NotFound')) {
        setScanning(false)
        setScanError('No camera detected. Enter the patient code manually instead.')
      }
    }

    try {
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, onSuccess, onError)
    } catch (err) {
      setScanning(false)
      setScanError((err && err.message) || 'Could not start the camera. Enter the patient code instead.')
    }
  }

  async function doLookup(query) {
    setError('')
    setScanError('')
    setFound(null)
    setBusy(true)
    const res = await lookupPatient(query)
    setBusy(false)
    if (res.success) {
      setFound(res.data)
    } else {
      setError(res.message || 'Patient not found.')
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!valid) {
      setError('Enter a valid MediCard ID in the format MC-XXXXXXXX.')
      return
    }
    doLookup({ medicardId: normalized })
  }

  async function handleRequestAccess() {
    if (!found) return
    setSending(true)
    setError('')
    const res = await requestPatientAccess({ medicardId: found.medicardId, reason: reason.trim() || undefined })
    setSending(false)
    if (res.success) {
      notify(res.message || 'Access request sent')
      if (res.data?.status === 'accepted') {
        navigate(`/doctor/patients/${res.data.patientId}`)
        return
      }
      setFound(null)
      setMedicardId('')
      setReason('')
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

      {error && <Alert>{error}</Alert>}

      <div className="doc-grid doc-grid-2">
        <Card
          title="Patient Lookup"
          subtitle="Scan the MediCard QR code or enter the patient's unique code"
          actions={
            <div className="doc-tabs doc-tabs-inline">
              <button type="button" className={mode === 'code' ? 'is-active' : ''} onClick={() => setMode('code')}>
                Enter code
              </button>
              <button type="button" className={mode === 'qr' ? 'is-active' : ''} onClick={() => setMode('qr')}>
                Scan QR
              </button>
            </div>
          }
        >
          {mode === 'code' && (
            <form onSubmit={handleSubmit}>
              <Field label="Patient Code" required>
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
              </Field>
              <button className="doc-btn doc-btn-block" type="submit" disabled={busy || !medicardId.trim()}>
                <SearchIcon size={16} /> {busy ? 'Looking up…' : 'Find patient'}
              </button>
            </form>
          )}

          {mode === 'qr' && (
            <div>
              {!scanning && !scanError && (
                <button className="doc-btn doc-btn-block" type="button" onClick={startScanner}>
                  <ScanIcon size={16} /> Start camera scanner
                </button>
              )}
              {scanning && (
                <div className="doc-qr-wrap">
                  <div id={readerIdRef.current || 'doc-qr-reader'} className="doc-qr-reader" />
                  <p className="doc-muted doc-mt">Point the camera at the patient's MediCard QR code.</p>
                  <button className="doc-btn doc-btn-ghost doc-btn-sm doc-mt" type="button" onClick={stopScanner}>
                    <CloseIcon size={14} /> Stop camera
                  </button>
                </div>
              )}
              {scanError && (
                <div>
                  <Alert>{scanError}</Alert>
                  <button className="doc-btn doc-btn-ghost doc-btn-block doc-mt" type="button" onClick={() => setMode('code')}>
                    Enter patient code instead
                  </button>
                </div>
              )}
            </div>
          )}

          {busy && (
            <div className="doc-mt">
              <Loading label="Looking up patient…" />
            </div>
          )}
        </Card>

        <Card title="How patient access works" subtitle="Your access is always patient-controlled">
          <ol className="doc-steps">
            <li>
              <span className="doc-step-num">1</span>
              <div>
                <strong>Scan or enter the patient code</strong>
                <p>The patient's unique code links to their profile. Sensitive history is never shown at this step.</p>
              </div>
            </li>
            <li>
              <span className="doc-step-num">2</span>
              <div>
                <strong>Request access</strong>
                <p>You confirm who you are and why access is needed.</p>
              </div>
            </li>
            <li>
              <span className="doc-step-num">3</span>
              <div>
                <strong>The patient approves your request</strong>
                <p>They see your name, specialization and reason, then accept or reject.</p>
              </div>
            </li>
            <li>
              <span className="doc-step-num">4</span>
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
      </div>

      {found && (
        <Modal open title="Patient found" size="md" onClose={() => setFound(null)}>
          <div className="doc-confirm-patient">
            <span className="doc-avatar doc-avatar-lg">{(found.patientName || 'P').slice(0, 1).toUpperCase()}</span>
            <div>
              <h3>{found.patientName || 'MediCard holder'}</h3>
              <p className="doc-code">{found.medicardId}</p>
            </div>
          </div>

          <div className="doc-info-grid doc-mt">
            <div>
              <span>Doctor requesting access</span>
              <strong>{profile?.name || 'You'}</strong>
            </div>
            <div>
              <span>Hospital / Clinic</span>
              <strong>{profile?.hospitalName || 'Independent practice'}</strong>
            </div>
          </div>

          <Field label="Reason for access" hint="Shown to the patient with your request" className="doc-mt">
            <textarea rows="2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Consultation, second opinion, emergency care" />
          </Field>

          <p className="doc-note doc-mt">
            <ShieldIcon size={16} />
            On approval, access lasts 24 hours. Complete medical history is only visible after the patient accepts.
          </p>

          {sending && (
            <div className="doc-mt">
              <Loading label="Sending access request…" />
            </div>
          )}

          <div className="doc-modal-foot-custom">
            <button type="button" className="doc-btn doc-btn-ghost" disabled={sending} onClick={() => setFound(null)}>
              Cancel
            </button>
            <button type="button" className="doc-btn" disabled={sending} onClick={handleRequestAccess}>
              {sending ? 'Sending…' : 'Request Access'}
            </button>
          </div>
        </Modal>
      )}

      <Card title={`Currently authorized patients (${authorized.length})`} className="doc-mt">
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
          <div className="doc-empty">
            <span className="doc-empty-icon"><UserIcon size={28} /></span>
            <h4>No authorized patients yet</h4>
            <p>Scan a patient's MediCard or enter their patient code above to get started.</p>
          </div>
        )}
      </Card>
    </>
  )
}

export default DoctorScan