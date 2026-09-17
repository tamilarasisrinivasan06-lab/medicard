import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getMyProfile,
  updateMyProfile,
  getMyAllergies,
  addAllergy,
  deleteAllergy,
  getMyContacts,
  addContact,
  deleteContact,
  getToken,
} from '../api'

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(typeof value === 'string' && value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

function PatientProfile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [allergies, setAllergies] = useState([])
  const [contacts, setContacts] = useState([])
  const [form, setForm] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    getMyProfile()
      .then((result) => {
        if (result.success) {
          setProfile(result.data)
          setForm({
            bloodGroup: result.data.bloodGroup || '',
            dateOfBirth: result.data.dateOfBirth ? String(result.data.dateOfBirth).slice(0, 10) : '',
            gender: result.data.gender || '',
            height: result.data.height || '',
            weight: result.data.weight || '',
            emergencyContactName: result.data.emergencyContact?.name || '',
            emergencyContactPhone: result.data.emergencyContact?.phone || '',
            address: result.data.address || '',
            city: result.data.city || '',
            state: result.data.state || '',
            pincode: result.data.pincode || '',
          })
        } else if (result.message === 'Invalid or expired token' || result.message === 'Authentication required') {
          localStorage.removeItem('token')
          localStorage.removeItem('role')
          navigate('/login')
        } else {
          setError(result.message || 'Failed to load profile')
        }
      })
      .catch(() => setError('Could not reach the backend. Is it running?'))

    getMyAllergies()
      .then((result) => result.success && setAllergies(result.data))
      .catch(() => {})

    getMyContacts()
      .then((result) => result.success && setContacts(result.data))
      .catch(() => {})
  }, [navigate])

  if (!getToken()) return null

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    const payload = {}
    for (const [key, value] of Object.entries(form)) {
      const trimmed = typeof value === 'string' ? value.trim() : value
      if (key === 'height' || key === 'weight') {
        if (trimmed !== '') {
          const num = Number(trimmed)
          if (Number.isNaN(num)) continue
          payload[key] = num
        }
      } else if (trimmed !== '') {
        payload[key] = trimmed
      } else {
        payload[key] = null
      }
    }
    const result = await updateMyProfile(payload)
    if (result.success) {
      setMessage(result.message || 'Profile updated')
      setProfile(result.data)
    } else {
      setError(result.message || 'Failed to update profile')
    }
  }

  async function handleAddAllergy(e) {
    e.preventDefault()
    setError('')
    const data = new FormData(e.target)
    const result = await addAllergy({
      allergen: data.get('allergen'),
      reaction: data.get('reaction') || null,
      severity: data.get('severity') || null,
    })
    if (result.success) {
      setAllergies((prev) => [...prev, result.data])
      e.target.reset()
    } else {
      setError(result.message || 'Failed to add allergy')
    }
  }

  async function handleDeleteAllergy(id) {
    const result = await deleteAllergy(id)
    if (result.success) setAllergies((prev) => prev.filter((a) => a.id !== id))
    else setError(result.message || 'Failed to remove allergy')
  }

  async function handleAddContact(e) {
    e.preventDefault()
    setError('')
    const data = new FormData(e.target)
    const result = await addContact({
      name: data.get('name'),
      relationship: data.get('relationship') || null,
      phone: data.get('phone') || null,
      alternatePhone: data.get('alternatePhone') || null,
    })
    if (result.success) {
      setContacts((prev) => [...prev, result.data])
      e.target.reset()
    } else {
      setError(result.message || 'Failed to add contact')
    }
  }

  async function handleDeleteContact(id) {
    const result = await deleteContact(id)
    if (result.success) setContacts((prev) => prev.filter((c) => c.id !== id))
    else setError(result.message || 'Failed to remove contact')
  }

  return (
    <div className="medicard-view">
      <h2>My Profile</h2>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="auth-success">{message}</p>}

      {profile && (
        <div className="profile-info">
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>MediCard ID:</strong> {profile.medicardId}</p>
          <p><strong>Date of birth:</strong> {formatDate(profile.dateOfBirth)}</p>

          <form onSubmit={handleSave} className="auth-form consultation-form">
            <label>
              Blood group
              <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
                <option value="">—</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </label>

            <label>
              Date of birth
              <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />
            </label>

            <label>
              Gender
              <select name="gender" value={form.gender} onChange={handleChange}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label>
              Height (cm)
              <input
                type="number"
                name="height"
                min="1"
                max="300"
                value={form.height}
                onChange={handleChange}
                placeholder="Optional"
              />
            </label>

            <label>
              Weight (kg)
              <input
                type="number"
                name="weight"
                min="1"
                max="500"
                value={form.weight}
                onChange={handleChange}
                placeholder="Optional"
              />
            </label>

            <label>
              Emergency contact name
              <input
                type="text"
                name="emergencyContactName"
                maxLength={200}
                value={form.emergencyContactName}
                onChange={handleChange}
                placeholder="Optional"
              />
            </label>

            <label>
              Emergency contact phone
              <input
                type="text"
                name="emergencyContactPhone"
                maxLength={30}
                value={form.emergencyContactPhone}
                onChange={handleChange}
                placeholder="Optional"
              />
            </label>

            <label>
              Address
              <input type="text" name="address" maxLength={500} value={form.address} onChange={handleChange} placeholder="Optional" />
            </label>

            <label>
              City
              <input type="text" name="city" maxLength={200} value={form.city} onChange={handleChange} placeholder="Optional" />
            </label>

            <label>
              State
              <input type="text" name="state" maxLength={200} value={form.state} onChange={handleChange} placeholder="Optional" />
            </label>

            <label>
              Pincode
              <input type="text" name="pincode" maxLength={20} value={form.pincode} onChange={handleChange} placeholder="Optional" />
            </label>

            <button type="submit">Save profile</button>
          </form>
        </div>
      )}

      <div className="portal-section">
        <h3>Allergies</h3>
        {allergies.length > 0 && (
          <div className="record-list">
            {allergies.map((a) => (
              <div className="record-card" key={a.id}>
                <p><strong>{a.allergen}</strong> {a.severity ? `(${a.severity})` : ''}</p>
                {a.reaction && <p>Reaction: {a.reaction}</p>}
                <button onClick={() => handleDeleteAllergy(a.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
        <form className="auth-form" onSubmit={handleAddAllergy}>
          <input name="allergen" placeholder="Allergen" required />
          <input name="reaction" placeholder="Reaction (optional)" />
          <select name="severity" defaultValue="">
            <option value="">Severity (optional)</option>
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
          <button type="submit">Add allergy</button>
        </form>
      </div>

      <div className="portal-section">
        <h3>Emergency contacts</h3>
        {contacts.length > 0 && (
          <div className="record-list">
            {contacts.map((c) => (
              <div className="record-card" key={c.id}>
                <p><strong>{c.name}</strong> {c.relationship ? `(${c.relationship})` : ''}</p>
                {c.phone && <p>Phone: {c.phone}</p>}
                {c.alternatePhone && <p>Alternate: {c.alternatePhone}</p>}
                <button onClick={() => handleDeleteContact(c.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
        <form className="auth-form" onSubmit={handleAddContact}>
          <input name="name" placeholder="Name" required />
          <input name="relationship" placeholder="Relationship (optional)" />
          <input name="phone" placeholder="Phone (optional)" />
          <input name="alternatePhone" placeholder="Alternate phone (optional)" />
          <button type="submit">Add contact</button>
        </form>
      </div>
    </div>
  )
}

export default PatientProfile