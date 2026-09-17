import { useState } from 'react'
import { registerUser } from '../api'

const ROLES = ['patient', 'doctor', 'pharmacist', 'diagnostic_staff', 'admin']

function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    password: '',
    role: 'patient',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    const result = await registerUser(form)

    if (result.success) {
      setMessage(`${result.message} You can now log in.`)
      setForm({ name: '', email: '', phone: '', dateOfBirth: '', gender: '', password: '', role: 'patient' })
    } else {
      setError(result.message || 'Registration failed')
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Register</h2>
      {message && <p className="auth-success">{message}</p>}
      {error && <p className="auth-error">{error}</p>}

      <input
        type="text"
        name="name"
        placeholder="Name"
        value={form.name}
        onChange={handleChange}
        required
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="phone"
        placeholder="Phone"
        value={form.phone}
        onChange={handleChange}
        required
      />
      <input
        type="date"
        name="dateOfBirth"
        placeholder="Date of birth"
        value={form.dateOfBirth}
        onChange={handleChange}
      />
      <select name="gender" value={form.gender} onChange={handleChange}>
        <option value="">Gender (optional)</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
      <input
        type="password"
        name="password"
        placeholder="Password (min 8 characters)"
        value={form.password}
        onChange={handleChange}
        required
      />
      <select name="role" value={form.role} onChange={handleChange}>
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
      <button type="submit">Register</button>
    </form>
  )
}

export default Register