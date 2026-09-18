import { useState } from 'react'
import { getMyProfile, updateMyProfile, getMyAllergies, getMyMedications, getMyContacts } from '../../api'
import {
  Card,
  Loading,
  Alert,
  EmptyState,
  Field,
  useAsync,
  useToast,
  formatDate,
  statusLabel,
} from '../../components/doctor/ui'
import { UserIcon, HeartIcon, PillIcon, PhoneIcon } from '../../components/doctor/icons'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function Profile() {
  const { notify } = useToast()
  const profile = useAsync(() => getMyProfile(), [])
  const allergies = useAsync(() => getMyAllergies(), [])
  const medications = useAsync(() => getMyMedications(), [])
  const contacts = useAsync(() => getMyContacts(), [])
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  const data = profile.data
  const values = form || data || {}

  function set(key, value) {
    setForm((prev) => ({ ...(prev || data || {}), [key]: value }))
  }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    const res = await updateMyProfile({
      bloodGroup: values.bloodGroup || null,
      dateOfBirth: values.dateOfBirth || null,
      gender: values.gender || null,
      height: values.height ? Number(values.height) : null,
      weight: values.weight ? Number(values.weight) : null,
      emergencyContactName: values.emergencyContact?.name || values.emergencyContactName || null,
      emergencyContactPhone: values.emergencyContact?.phone || values.emergencyContactPhone || null,
      address: values.address || null,
      city: values.city || null,
      state: values.state || null,
      pincode: values.pincode || null,
    })
    setBusy(false)
    if (res.success) {
      notify('Profile updated', 'success')
      profile.reload()
    } else {
      notify(res.message || 'Could not update profile', 'error')
    }
  }

  if (profile.loading) return <Loading label="Loading profile…" />
  if (profile.error) return <Alert>{profile.error}</Alert>

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>My Profile</h1>
          <p>Personal and medical details on record.</p>
        </div>
      </header>

      <div className="doc-grid doc-grid-2">
        <Card title="Personal details">
          <div className="doc-detail-grid">
            <div className="doc-detail-row">
              <span>Name</span>
              <strong>{data?.name || '—'}</strong>
            </div>
            <div className="doc-detail-row">
              <span>Medi Card ID</span>
              <strong>{data?.medicardId || '—'}</strong>
            </div>
            <div className="doc-detail-row">
              <span>Blood group</span>
              <strong>{data?.bloodGroup || 'Not set'}</strong>
            </div>
            <div className="doc-detail-row">
              <span>Date of birth</span>
              <strong>{formatDate(data?.dateOfBirth)}</strong>
            </div>
            <div className="doc-detail-row">
              <span>Gender</span>
              <strong>{data?.gender || 'Not set'}</strong>
            </div>
            <div className="doc-detail-row">
              <span>Location</span>
              <strong>{[data?.city, data?.state].filter(Boolean).join(', ') || 'Not set'}</strong>
            </div>
          </div>
        </Card>

        <Card>
          <div className="doc-timeline-item">
            <span className="doc-timeline-dot" />
            <div className="doc-timeline-body">
              <div className="doc-timeline-head">
                <strong>
                  <UserIcon size={15} /> Emergency contact
                </strong>
              </div>
              {contacts.data && contacts.data.length > 0 ? (
                <>
                  {contacts.data.map((c) => (
                    <p key={c.id} className="doc-muted">
                      <strong>{c.name}</strong>
                      {c.relationship ? ` (${c.relationship})` : ''}
                      {c.phone ? (
                        <>
                          {' '}
                          · <PhoneIcon size={13} /> {c.phone}
                        </>
                      ) : null}
                    </p>
                  ))}
                </>
              ) : (
                <p className="doc-muted">No emergency contacts on file.</p>
              )}
              {data?.emergencyContact?.name && (
                <p className="doc-muted">
                  Primary: {data.emergencyContact.name}
                  {data.emergencyContact.phone ? ` · ${data.emergencyContact.phone}` : ''}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Allergies" subtitle="Known allergies recorded on your profile">
        {allergies.data && allergies.data.length > 0 ? (
          <div className="doc-row-list">
            {allergies.data.map((a) => (
              <div key={a.id} className="doc-row-item">
                <span className="doc-activity-icon">
                  <HeartIcon size={18} />
                </span>
                <div className="doc-row-main">
                  <strong>{a.allergen}</strong>
                  <span>{a.reaction || 'No reaction noted'}</span>
                </div>
                {a.severity && <span className="doc-tag doc-tag-amber">{statusLabel(a.severity)}</span>}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<HeartIcon size={28} />} title="No allergies" message="No allergies recorded." />
        )}
      </Card>

      <Card title="Current medications">
        {medications.data && medications.data.length > 0 ? (
          <div className="doc-row-list">
            {medications.data.map((m) => (
              <div key={m.id} className="doc-row-item">
                <span className="doc-activity-icon">
                  <PillIcon size={18} />
                </span>
                <div className="doc-row-main">
                  <strong>{m.medicineName}</strong>
                  <span>
                    {[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ') || 'As directed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<PillIcon size={28} />} title="No medications" message="No active medications recorded." />
        )}
      </Card>

      <Card title="Update details">
        <form className="doc-grid" onSubmit={save}>
          <div className="doc-grid doc-grid-2">
            <Field label="Blood group">
              <select value={values.bloodGroup || ''} onChange={(e) => set('bloodGroup', e.target.value)}>
                <option value="">Not set</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date of birth">
              <input type="date" value={values.dateOfBirth ? String(values.dateOfBirth).slice(0, 10) : ''} onChange={(e) => set('dateOfBirth', e.target.value)} />
            </Field>
            <Field label="Gender">
              <select value={values.gender || ''} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Not set</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Height (cm)">
              <input type="number" min="1" value={values.height || ''} onChange={(e) => set('height', e.target.value)} />
            </Field>
            <Field label="Weight (kg)">
              <input type="number" min="1" value={values.weight || ''} onChange={(e) => set('weight', e.target.value)} />
            </Field>
            <Field label="Emergency contact name">
              <input type="text" value={values.emergencyContact?.name || values.emergencyContactName || ''} onChange={(e) => set('emergencyContactName', e.target.value)} />
            </Field>
            <Field label="Emergency contact phone">
              <input type="tel" value={values.emergencyContact?.phone || values.emergencyContactPhone || ''} onChange={(e) => set('emergencyContactPhone', e.target.value)} />
            </Field>
            <Field label="Pincode">
              <input type="text" value={values.pincode || ''} onChange={(e) => set('pincode', e.target.value)} />
            </Field>
          </div>
          <Field label="Address">
            <textarea rows={2} value={values.address || ''} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <div className="doc-grid doc-grid-2">
            <Field label="City">
              <input type="text" value={values.city || ''} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="State">
              <input type="text" value={values.state || ''} onChange={(e) => set('state', e.target.value)} />
            </Field>
          </div>
          <div>
            <button type="submit" className="doc-btn" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default Profile
