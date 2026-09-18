import { useState } from 'react'
import { getSuperAdminProfile, updateSuperAdminProfile } from '../../api'
import { useAsync, useToast, Card, Loading, Alert, PageHeader, Modal, Field, StatusBadge, formatDate } from '../../components/doctor/ui'
import { EditIcon } from '../../components/doctor/icons'

function SuperAdminProfile() {
  const { notify } = useToast()
  const { data, loading, error, reload } = useAsync(() => getSuperAdminProfile(), [])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ fullName: '', phone: '', gender: '', dateOfBirth: '' })

  const initial = (data?.name || 'S').slice(0, 1).toUpperCase()

  function openEdit() {
    setForm({
      fullName: data?.name || '',
      phone: data?.phone || '',
      gender: data?.gender || '',
      dateOfBirth: data?.dateOfBirth || '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.fullName.trim()) {
      notify('Full name cannot be empty', 'error')
      return
    }
    setBusy(true)
    const res = await updateSuperAdminProfile(form)
    setBusy(false)
    if (res.success) {
      notify('Profile updated')
      setOpen(false)
      reload()
    } else {
      notify(res.message || 'Could not update profile', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Profile"
        subtitle="Your Super Admin account information."
        actions={
          data ? (
            <button className="doc-btn" onClick={openEdit}>
              <EditIcon size={16} /> Edit profile
            </button>
          ) : null
        }
      />

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <Loading label="Loading profile…" />
      ) : data ? (
        <div className="doc-grid doc-grid-2">
          <Card title="Account">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="mc-avatar mc-avatar-lg">{initial}</span>
              <div>
                <h4 style={{ margin: 0 }}>{data.name}</h4>
                <p className="doc-muted" style={{ marginTop: 4 }}>{data.email}</p>
              </div>
            </div>
          </Card>

          <Card title="Details">
            <div className="doc-detail-grid">
              <div className="doc-detail-row"><span>Role</span><strong>Super Admin</strong></div>
              <div className="doc-detail-row">
                <span>Status</span>
                <strong><StatusBadge status={data.isActive ? 'active' : 'disabled'} /></strong>
              </div>
              <div className="doc-detail-row"><span>Phone</span><strong>{data.phone || '—'}</strong></div>
              <div className="doc-detail-row"><span>Gender</span><strong>{data.gender ? String(data.gender).replace(/^./, (c) => c.toUpperCase()) : '—'}</strong></div>
              <div className="doc-detail-row"><span>Date of birth</span><strong>{data.dateOfBirth ? formatDate(data.dateOfBirth) : '—'}</strong></div>
              <div className="doc-detail-row"><span>Member since</span><strong>{formatDate(data.createdAt)}</strong></div>
            </div>
          </Card>
        </div>
      ) : null}

      <Modal
        open={open}
        title="Edit profile"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="doc-btn doc-btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="doc-btn" onClick={handleSave} disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      >
        <Field label="Full name" required>
          <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Your full name" />
        </Field>
        <Field label="Phone">
          <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Contact number" />
        </Field>
        <Field label="Gender">
          <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Date of birth">
          <input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
        </Field>
      </Modal>
    </>
  )
}

export default SuperAdminProfile