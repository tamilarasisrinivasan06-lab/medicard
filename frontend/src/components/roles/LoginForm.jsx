import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, setSession, dashboardForRole } from '../../api'
import PasswordInput from './PasswordInput'
import AuthError from './AuthError'
import LoadingButton from './LoadingButton'
import { ArrowLeftIcon } from './roleIcons'

function LoginForm({ config }) {
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [touched, setTouched] = useState({ id: false, password: false })

  const trimmedId = loginId.trim()
  const idError = !trimmedId ? `Please enter your ${config.idLabel}` : ''
  const passwordError = !password ? 'Please enter your password' : ''
  const valid = trimmedId.length > 0 && password.length > 0

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!valid || submitting) return

    setSubmitting(true)
    try {
      const result = await login({
        role: config.role,
        loginId: trimmedId,
        password,
      })

      if (result.success) {
        setSession(result.data.token, result.data.user.role, remember)
        navigate(dashboardForRole(result.data.user.role), { replace: true })
      } else {
        setError(result.message || 'Invalid email or password.')
      }
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="authx-form" onSubmit={handleSubmit} noValidate>
      <div className="authx-field">
        <label htmlFor={`login-id-${config.key}`}>{config.idLabel}</label>
        <input
          id={`login-id-${config.key}`}
          name="loginId"
          type="text"
          value={loginId}
          placeholder={config.placeholder}
          onChange={(e) => {
            setLoginId(e.target.value)
            setError('')
          }}
          onBlur={() => setTouched((t) => ({ ...t, id: true }))}
          autoComplete="username"
        />
        {touched.id && idError && <p className="authx-field-error">{idError}</p>}
      </div>

      <div className="authx-field">
        <label htmlFor={`login-password-${config.key}`}>Password</label>
        <PasswordInput
          id={`login-password-${config.key}`}
          name="password"
          value={password}
          placeholder="Enter your password"
          onChange={(e) => {
            setPassword(e.target.value)
            setError('')
          }}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          autoComplete="current-password"
        />
        {touched.password && passwordError && <p className="authx-field-error">{passwordError}</p>}
      </div>

      <AuthError message={error} />

      <div className="authx-row">
        <label className="authx-check">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Remember me
        </label>
        <Link to="/forgot-password" className="authx-link">
          Forgot Password?
        </Link>
      </div>

      <LoadingButton type="submit" loading={submitting} disabled={!valid} loadingText="Signing in…">
        Login
      </LoadingButton>

      <Link to="/login" className="authx-change">
        <ArrowLeftIcon size={16} /> Change Role
      </Link>
    </form>
  )
}

export default LoginForm