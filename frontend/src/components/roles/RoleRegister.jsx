import { useState } from 'react'
import { Navigate, Link, useNavigate, useParams } from 'react-router-dom'
import { registerUser } from '../../api'
import PageContainer from './PageContainer'
import BrandHeader from './BrandHeader'
import AuthError from './AuthError'
import LoadingButton from './LoadingButton'
import { RoleIcon, ArrowLeftIcon } from './roleIcons'
import { roleConfigForSlug } from './roleConfig'

const REGISTERABLE_ROLES = ['patient', 'doctor', 'pharmacist', 'diagnostic_staff']

const SPECIALIZATIONS = [
  'General Medicine',
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'ENT',
  'Gastroenterology',
  'Gynecology',
  'Neurology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
  'Urology',
]

function RoleRegister() {
  const { role } = useParams()
  const navigate = useNavigate()
  const config = roleConfigForSlug(role)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    password: '',
    specialization: '',
    qualification: '',
    experience: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!config || !REGISTERABLE_ROLES.includes(config.role)) {
    return <Navigate to="/login" replace />
  }

  const valid =
    form.name.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    form.password.length >= 8 &&
    (config.role !== 'doctor' || form.specialization.trim())

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid || submitting) return
    setError('')
    setSubmitting(true)

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: config.role,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
      }
      if (config.role === 'doctor') {
        payload.specialization = form.specialization.trim()
        payload.qualification = form.qualification.trim() || undefined
        payload.experience = form.experience ? Number(form.experience) : undefined
      }

      const result = await registerUser(payload)

      if (result.success) {
        navigate(`/login/${config.key}?created=1`, { replace: true })
        return
      }
      setError(result.message || 'Unable to create your account right now. Please try again.')
    } catch {
      setError('Unable to reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer narrow>
      <Link to={`/login/${config.key}`} className="authx-back">
        <ArrowLeftIcon size={16} /> Back to {config.label} Login
      </Link>

      <BrandHeader />

      <div className="authx-card">
        <div className="authx-login-head">
          <span
            className="authx-login-icon"
            style={{ background: config.soft, color: config.color }}
            aria-hidden="true"
          >
            <RoleIcon name={config.icon} size={28} />
          </span>
          <div>
            <h1>Create {config.label} Account</h1>
            <p>Register as a {config.label}</p>
          </div>
        </div>

        <form className="authx-form" onSubmit={handleSubmit}>
          <AuthError message={error} />

          <div className="authx-field">
            <label htmlFor={`reg-name-${config.key}`}>Full name</label>
            <input
              id={`reg-name-${config.key}`}
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="authx-field">
            <label htmlFor={`reg-email-${config.key}`}>Email address</label>
            <input
              id={`reg-email-${config.key}`}
              type="email"
              name="email"
              placeholder="Enter your email address"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="authx-field">
            <label htmlFor={`reg-phone-${config.key}`}>Phone</label>
            <input
              id={`reg-phone-${config.key}`}
              type="text"
              name="phone"
              placeholder="Enter your phone number"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>

          {config.role === 'doctor' && (
            <>
              <div className="authx-field">
                <label htmlFor="reg-spec">Specialization</label>
                <input
                  id="reg-spec"
                  type="text"
                  name="specialization"
                  list="doc-specs"
                  placeholder="e.g. Cardiology"
                  value={form.specialization}
                  onChange={handleChange}
                  required
                />
                <datalist id="doc-specs">
                  {SPECIALIZATIONS.map((spec) => (
                    <option key={spec} value={spec} />
                  ))}
                </datalist>
              </div>

              <div className="authx-field">
                <label htmlFor="reg-qual">Qualification</label>
                <input
                  id="reg-qual"
                  type="text"
                  name="qualification"
                  placeholder="e.g. MD, MS (optional)"
                  value={form.qualification}
                  onChange={handleChange}
                />
              </div>

              <div className="authx-field">
                <label htmlFor="reg-exp">Experience (years)</label>
                <input
                  id="reg-exp"
                  type="number"
                  name="experience"
                  min="0"
                  max="70"
                  placeholder="Years of practice (optional)"
                  value={form.experience}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {config.role === 'patient' && (
            <>
              <div className="authx-field">
                <label htmlFor="reg-dob">Date of birth (optional)</label>
                <input
                  id="reg-dob"
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                />
              </div>
              <div className="authx-field">
                <label htmlFor="reg-gender">Gender (optional)</label>
                <select id="reg-gender" name="gender" value={form.gender} onChange={handleChange}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </>
          )}

          <div className="authx-field">
            <label htmlFor={`reg-password-${config.key}`}>Password</label>
            <input
              id={`reg-password-${config.key}`}
              type="password"
              name="password"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <LoadingButton type="submit" loading={submitting} disabled={!valid} loadingText="Creating account…">
            Create {config.label} account
          </LoadingButton>

          <Link to={`/login/${config.key}`} className="authx-change">
            <ArrowLeftIcon size={16} /> Back to {config.label} Login
          </Link>
        </form>
      </div>
    </PageContainer>
  )
}

export default RoleRegister