import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser, setSession, dashboardForRole } from '../api'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    const result = await loginUser(email, password)

    if (result.success) {
      setSession(result.data.token, result.data.user.role, true)
      setMessage(`Login successful. Welcome, ${result.data.user.name} (${result.data.user.role})`)
      navigate(dashboardForRole(result.data.user.role), { replace: true })
    } else {
      setError(result.message || 'Invalid login ID or password')
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
      <h1 className="role-title">Staff Login</h1>
      <p className="role-subtitle">For pharmacists and diagnostic staff</p>

      <form className="auth-form role-login-form" onSubmit={handleSubmit}>
        <h2>Login</h2>
        {message && <p className="auth-success">{message}</p>}
        {error && <p className="auth-error">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>

        <Link to="/login" className="role-change-link">
          ← Change Role
        </Link>
      </form>
    </div>
  )
}

export default Login