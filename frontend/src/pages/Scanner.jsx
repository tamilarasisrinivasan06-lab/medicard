import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { scanMedicard, verifyMedicard, getToken, getRole } from '../api'

const HC_ROLES = ['doctor', 'pharmacist', 'diagnostic_staff', 'hospital']

function Scanner() {
  const navigate = useNavigate()
  const hasToken = Boolean(getToken())
  const allowedRole = HC_ROLES.includes(getRole())
  const scannerRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const [step, setStep] = useState('scan')
  const [verification, setVerification] = useState(null)
  const [otp, setOtp] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hasToken) {
      navigate('/login')
      return
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [navigate, hasToken])

  if (!hasToken) return null

  function startScanner() {
    setError('')
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          scanner.stop().catch(() => {})
          scannerRef.current = null
          setScanning(false)
          handlePayload(decodedText)
        },
        () => {}
      )
      .then(() => setScanning(true))
      .catch(() => {
        setScanning(false)
        setError('Could not start the camera. Use the manual fallback below.')
      })
  }

  function stopScanner() {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current.clear().catch(() => {})
      scannerRef.current = null
      setScanning(false)
    }
  }

  async function handlePayload(payload) {
    setError('')
    const res = await scanMedicard(payload)
    if (res.success && res.verificationRequired) {
      setVerification(res)
      setStep('otp')
    } else if (res.success) {
      setResult(res)
      setStep('done')
    } else {
      setError(res.message || 'Scan failed')
    }
  }

  async function handleOtp(e) {
    e.preventDefault()
    setError('')
    const res = await verifyMedicard(verification.verificationId, otp)
    if (res.success) {
      setResult(res)
      setStep('done')
    } else {
      setError(res.message || 'Verification failed')
    }
  }

  function reset() {
    setStep('scan')
    setResult(null)
    setVerification(null)
    setOtp('')
    setManual('')
    setError('')
  }

  return (
    <div className="medicard-view">
      <h2>Scan MediCard QR</h2>

      {!allowedRole && <p className="auth-error">Only doctor, pharmacist, or diagnostic staff can scan.</p>}
      {error && <p className="auth-error">{error}</p>}

      {allowedRole && step === 'scan' && (
        <>
          <div id="qr-reader" className="qr-reader" />
          {!scanning ? (
            <button onClick={startScanner}>Start camera</button>
          ) : (
            <button onClick={stopScanner}>Stop camera</button>
          )}
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (manual.trim()) handlePayload(manual.trim())
            }}
          >
            <input
              placeholder="Or enter QR payload manually (dev fallback)"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <button type="submit">Verify manually</button>
          </form>
        </>
      )}

      {allowedRole && step === 'otp' && (
        <>
          <p className="medicard-status">MediCard: {verification.medicardId} — {verification.patientName}</p>
          {verification.devOtp && (
            <p className="medicard-status">Dev OTP (development only): {verification.devOtp}</p>
          )}
          <form className="auth-form" onSubmit={handleOtp}>
            <input placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required />
            <button type="submit">Verify OTP</button>
          </form>
        </>
      )}

      {allowedRole && step === 'done' && result && (
        <>
          <p className="auth-success">{result.message}</p>
          {result.data?.expiresAt && (
            <p className="medicard-status">
              Temporary access valid until: {new Date(result.data.expiresAt).toLocaleString()}
            </p>
          )}
          <button onClick={reset}>Scan another</button>
        </>
      )}
    </div>
  )
}

export default Scanner