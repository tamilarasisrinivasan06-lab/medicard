import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../api'
import PageContainer from './PageContainer'
import BrandHeader from './BrandHeader'
import AuthError from './AuthError'
import LoadingButton from './LoadingButton'
import { ArrowLeftIcon, LockIcon } from './roleIcons'

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
    <PageContainer narrow>
      <Link to="/login" className="authx-back">
        <ArrowLeftIcon size={16} /> Back to login
      </Link>

      <BrandHeader />

      <div className="authx-card">
        <div className="authx-login-head">
          <span className="authx-login-icon" style={{ background: '#eaf2fe', color: '#1a73e8' }} aria-hidden="true">
            <LockIcon size={26} />
          </span>
          <div>
            <h1>Forgot Password</h1>
            <p>Enter the login ID for your MediCard account</p>
          </div>
        </div>

        <form className="authx-form" onSubmit={handleSubmit} noValidate>
          <div className="authx-field">
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
            <p className="authx-success" role="status">
              {message}
            </p>
          )}
          {devToken && <p className="authx-devnote">{devToken}</p>}

          <LoadingButton type="submit" loading={submitting} disabled={!valid} loadingText="Sending…">
            Send Reset Link
          </LoadingButton>

          <Link to="/login" className="authx-change">
            <ArrowLeftIcon size={16} /> Back to Login
          </Link>
        </form>
      </div>
    </PageContainer>
  )
}

export default ForgotPassword
