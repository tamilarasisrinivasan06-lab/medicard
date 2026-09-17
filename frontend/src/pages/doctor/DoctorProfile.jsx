import { useEffect, useState } from 'react'
import { getDoctorProfile, updateDoctorProfile, listHospitals } from '../../api'
import { useAsync, useToast, Card, Loading, Alert, PageHeader } from '../../components/doctor/ui'
import { UserIcon, BuildingIcon, CheckIcon } from '../../components/doctor/icons'

function DoctorProfile() {
  const { notify } = useToast()
  const { data, loading, error, reload } = useAsync(() => getDoctorProfile(), [])
  const [hospitals, setHospitals] = useState([])
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listHospitals().then((res) => {
      if (res.success) setHospitals(res.data || [])
    })
  }, [])

  useEffect(() => {
    if (data) {
      // oxlint-disable-next-line react/set-state-in-effect -- sync the fetched profile into the editable form
      setForm({
        specialization: data.specialization || '',
        qualification: data.qualification || '',
        registrationNumber: data.registrationNumber || '',
        experience: data.experience ?? '',
        consultationFee: data.consultationFee ?? '',
        hospitalId: data.hospitalId || '',
      })
    }
  }, [data])

  if (loading || !form) return <Loading label="Loading profile…" />

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    const payload = {
      specialization: form.specialization.trim() || null,
      qualification: form.qualification.trim() || null,
      registrationNumber: form.registrationNumber.trim() || null,
      experience: form.experience === '' ? null : Number(form.experience),
      consultationFee: form.consultationFee === '' ? null : Number(form.consultationFee),
      hospitalId: form.hospitalId === '' ? null : Number(form.hospitalId),
    }
    const res = await updateDoctorProfile(payload)
    setBusy(false)
    if (res.success) {
      notify('Profile updated')
      reload()
    } else {
      notify(res.message || 'Could not update profile', 'error')
    }
  }

  return (
    <>
      <PageHeader title="My Profile" subtitle="Your professional details visible to patients when you request access." />

      {error && <Alert>{error}</Alert>}

      <div className="doc-grid doc-grid-2">
        <Card title="Account" subtitle="Managed by the platform">
          <div className="doc-profile-head">
            <div className="doc-avatar-lg">
              <UserIcon size={30} />
            </div>
            <div>
              <strong>{data?.name || 'Doctor'}</strong>
              <p className="doc-muted">{data?.email || '—'}</p>
              <p className="doc-muted">{data?.specialization || 'Specialization not set'}</p>
            </div>
          </div>
          <div className="doc-detail-grid doc-mt">
            <div className="doc-detail-row">
              <span>Hospital</span>
              <strong>{data?.hospitalName || 'Not assigned'}</strong>
            </div>
            <div className="doc-detail-row">
              <span>Member since</span>
              <strong>{data?.createdAt ? new Date(data.createdAt).toLocaleDateString() : '—'}</strong>
            </div>
          </div>
        </Card>

        <Card title="Professional details" subtitle="Keep your information up to date">
          <form onSubmit={handleSubmit}>
            <label className="doc-field">
              <span className="doc-field-label">Specialization</span>
              <input value={form.specialization} onChange={(e) => set('specialization', e.target.value)} placeholder="e.g. Cardiologist" />
            </label>
            <label className="doc-field">
              <span className="doc-field-label">Qualification</span>
              <input value={form.qualification} onChange={(e) => set('qualification', e.target.value)} placeholder="e.g. MBBS, MD" />
            </label>
            <label className="doc-field">
              <span className="doc-field-label">Registration number</span>
              <input value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} />
            </label>
            <div className="doc-grid doc-grid-2">
              <label className="doc-field">
                <span className="doc-field-label">Experience (years)</span>
                <input type="number" min="0" value={form.experience} onChange={(e) => set('experience', e.target.value)} />
              </label>
              <label className="doc-field">
                <span className="doc-field-label">Consultation fee</span>
                <input type="number" min="0" value={form.consultationFee} onChange={(e) => set('consultationFee', e.target.value)} />
              </label>
            </div>
            <label className="doc-field">
              <span className="doc-field-label"><BuildingIcon size={14} /> Hospital / Clinic</span>
              <select value={form.hospitalId} onChange={(e) => set('hospitalId', e.target.value)}>
                <option value="">Not affiliated</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}{h.city ? ` · ${h.city}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <button className="doc-btn" type="submit" disabled={busy}>
              <CheckIcon size={16} /> {busy ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </Card>
      </div>
    </>
  )
}

export default DoctorProfile