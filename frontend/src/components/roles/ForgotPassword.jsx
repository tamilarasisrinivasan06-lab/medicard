import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../api'
import AuthError from './AuthError'
import LoadingButton from './LoadingButton'
import { ArrowLeftIcon } from './roleIcons'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [devToken, setDevToken] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!valid || submitting) return

    setSubmitting(true)
    try {
      const result = await forgotPassword(email.trim())
      if (result.success) {
        setMessage(result.message || 'If an account exists for this ID, a password reset has been issued.')
        if (result.devToken) {
          setDevToken(`Development reset token: ${result.devToken}`)
        }
      } else {
        setError(result.message || 'Could not process the request. Please try again.')
      }
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="role-page">
      <div className="medicard-brand">
        <span className="medicard-logo brand-logo" aria-hidden="true">
          M
        </span>
        <span className="medicard-brand-name">MediCard</span>
      </div>

      <h1 className="role-title">Forgot Password</h1>
      <p className="role-subtitle">Enter the login ID for your MediCard account</p>

      <form className="auth-form role-login-form" onSubmit={handleSubmit} noValidate>
        <div className="role-field">
          <label htmlFor="forgot-email">Login ID (Email)</label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            value={email}
            placeholder="Enter your email"
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            autoComplete="email"
          />
        </div>

        <AuthError message={error} />
        {message && (
          <p className="role-success" role="status">
            {message}
          </p>
        )}
        {devToken && <p className="role-note">{devToken}</p>}

        <LoadingButton type="submit" loading={submitting} disabled={!valid} loadingText="Sending…">
          Send Reset Link
        </LoadingButton>

        <Link to="/login" className="role-change-link">
          <ArrowLeftIcon size={16} /> Back to Login
        </Link>
      </form>
    </div>
  )
}

export default ForgotPassword