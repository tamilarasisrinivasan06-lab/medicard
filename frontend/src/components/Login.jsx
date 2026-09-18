import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser, setSession, dashboardForRole } from '../api'
import PageContainer from './roles/PageContainer'
import BrandHeader from './roles/BrandHeader'
import AuthError from './roles/AuthError'
import LoadingButton from './roles/LoadingButton'
import { ArrowLeftIcon, BadgeIcon } from './roles/roleIcons'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const valid = email.trim().length > 0 && password.length > 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid || submitting) return
    setMessage('')
    setError('')
    setSubmitting(true)

    try {
      const result = await loginUser(email.trim(), password)

      if (result.success) {
        setSession(result.data.token, result.data.user.role, true)
        setMessage(`Login successful. Welcome, ${result.data.user.name} (${result.data.user.role})`)
        navigate(dashboardForRole(result.data.user.role), { replace: true })
      } else {
        setError(result.message || 'Invalid email or password.')
      }
    } catch {
      setError('Unable to reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer narrow>
      <Link to="/login" className="authx-back">
        <ArrowLeftIcon size={16} /> All portals
      </Link>

      <BrandHeader />

      <div className="authx-card">
        <div className="authx-login-head">
          <span className="authx-login-icon" style={{ background: '#e2f5f2', color: '#0d9488' }} aria-hidden="true">
            <BadgeIcon size={28} />
          </span>
          <div>
            <h1>Staff Login</h1>
            <p>For pharmacy &amp; diagnostic lab staff</p>
          </div>
        </div>

        <form className="authx-form" onSubmit={handleSubmit} noValidate>
          {message && (
            <p className="authx-success" role="status">
              {message}
            </p>
          )}
          <AuthError message={error} />

          <div className="authx-field">
            <label htmlFor="staff-email">Email address</label>
            <input
              id="staff-email"
              name="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              autoComplete="username"
            />
          </div>

          <div className="authx-field">
            <label htmlFor="staff-password">Password</label>
            <input
              id="staff-password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              autoComplete="current-password"
            />
          </div>

          <LoadingButton type="submit" loading={submitting} disabled={!valid} loadingText="Signing in…">
            Login
          </LoadingButton>

          <Link to="/login" className="authx-change">
            <ArrowLeftIcon size={16} /> Change Role
          </Link>
        </form>
      </div>
    </PageContainer>
  )
}

export default Login
