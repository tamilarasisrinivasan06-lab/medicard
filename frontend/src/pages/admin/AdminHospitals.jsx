import { useState } from 'react'
import { getAdminHospitals, createAdminHospital, getRole } from '../../api'
import { useAsync, useToast, Card, Loading, Alert, EmptyState, PageHeader, Modal, Field } from '../../components/doctor/ui'
import { BuildingIcon, PlusIcon } from '../../components/doctor/icons'

function AdminHospitals() {
  const { notify } = useToast()
  const role = getRole()
  const canCreate = role === 'admin' || role === 'super_admin'
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', city: '', state: '', address: '', phone: '', email: '', website: '' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const { data, loading, error, reload } = useAsync(() => getAdminHospitals(), [])

  async function handleCreate() {
    setBusy(true)
    const res = await createAdminHospital(form)
    setBusy(false)
    if (res.success) {
      notify('Hospital created')
      setOpen(false)
      setForm({ name: '', city: '', state: '', address: '', phone: '', email: '', website: '' })
      reload()
    } else {
      notify(res.message || 'Could not create hospital', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Hospitals"
        subtitle={canCreate ? 'Manage partner hospitals and clinics.' : 'Your hospital profile.'}
        actions={
          canCreate ? (
            <button className="doc-btn" onClick={() => setOpen(true)}>
              <PlusIcon size={16} /> Add hospital
            </button>
          ) : null
        }
      />

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <Loading label="Loading hospitals…" />
      ) : (data || []).length === 0 ? (
        <Card>
          <EmptyState icon={<BuildingIcon size={26} />} title="No hospitals" message="Add the first hospital to get started." />
        </Card>
      ) : (
        <div className="doc-grid doc-grid-2">
          {(data || []).map((h) => (
            <Card key={h.id} title={h.name} subtitle={[h.city, h.state].filter(Boolean).join(', ') || 'No location'}>
              <div className="doc-detail-grid">
                <div className="doc-detail-row"><span>Doctors</span><strong>{h.doctorCount}</strong></div>
                <div className="doc-detail-row"><span>Linked users</span><strong>{h.userCount}</strong></div>
                <div className="doc-detail-row"><span>Phone</span><strong>{h.phone || '—'}</strong></div>
                <div className="doc-detail-row"><span>Email</span><strong>{h.email || '—'}</strong></div>
              </div>
              {h.address && <p className="doc-muted" style={{ marginTop: 10 }}>{h.address}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title="Add hospital"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="doc-btn doc-btn-ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
            <button className="doc-btn" disabled={busy || !form.name.trim()} onClick={handleCreate}>
              {busy ? 'Saving…' : 'Create hospital'}
            </button>
          </>
        }
      >
        <Field label="Name" required>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Riverside Medical Center" />
        </Field>
        <div className="doc-grid doc-grid-2">
          <Field label="City">
            <input value={form.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="State">
            <input value={form.state} onChange={(e) => set('state', e.target.value)} />
          </Field>
        </div>
        <Field label="Address">
          <input value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <div className="doc-grid doc-grid-2">
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
        </div>
        <Field label="Website">
          <input value={form.website} onChange={(e) => set('website', e.target.value)} />
        </Field>
      </Modal>
    </>
  )
}

export default AdminHospitals
