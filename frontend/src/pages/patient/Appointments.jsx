import { useState } from 'react'
import {
  getMyAppointments,
  createAppointment,
  cancelAppointment,
  listDoctors,
  listHospitals,
} from '../../api'
import {
  Card,
  Loading,
  Alert,
  EmptyState,
  StatusBadge,
  Modal,
  ConfirmDialog,
  Field,
  useAsync,
  useToast,
  formatDate,
  formatTime,
} from '../../components/doctor/ui'
import { CalendarIcon, PlusIcon, BuildingIcon } from '../../components/doctor/icons'

function Appointments() {
  const { notify } = useToast()
  const { data, loading, error, reload } = useAsync(() => getMyAppointments(), [])
  const doctors = useAsync(() => listDoctors(), [])
  const hospitals = useAsync(() => listHospitals(), [])
  const [open, setOpen] = useState(false)
  const [cancelId, setCancelId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ doctorId: '', hospitalId: '', appointmentDate: '', appointmentTime: '', reason: '' })

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    const payload = {
      appointmentDate: form.appointmentDate,
      appointmentTime: form.appointmentTime || null,
      reason: form.reason || null,
      doctorId: form.doctorId ? Number(form.doctorId) : null,
      hospitalId: form.hospitalId ? Number(form.hospitalId) : null,
    }
    const res = await createAppointment(payload)
    setBusy(false)
    if (res.success) {
      notify('Appointment requested', 'success')
      setOpen(false)
      setForm({ doctorId: '', hospitalId: '', appointmentDate: '', appointmentTime: '', reason: '' })
      reload()
    } else {
      notify(res.message || 'Could not book appointment', 'error')
    }
  }

  async function confirmCancel() {
    setBusy(true)
    const res = await cancelAppointment(cancelId)
    setBusy(false)
    setCancelId(null)
    if (res.success) {
      notify('Appointment cancelled', 'success')
      reload()
    } else {
      notify(res.message || 'Could not cancel appointment', 'error')
    }
  }

  const list = data || []

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>Appointments</h1>
          <p>Book a visit and manage your scheduled appointments.</p>
        </div>
        <div className="doc-page-actions">
          <button type="button" className="doc-btn" onClick={() => setOpen(true)}>
            <PlusIcon size={16} /> Book appointment
          </button>
        </div>
      </header>

      {loading && <Loading label="Loading appointments…" />}
      {error && <Alert>{error}</Alert>}

      {data && list.length === 0 && (
        <EmptyState icon={<CalendarIcon size={28} />} title="No appointments" message="Book your first appointment to get started." action={<button type="button" className="doc-btn" onClick={() => setOpen(true)}>Book appointment</button>} />
      )}

      {list.length > 0 && (
        <Card>
          <div className="doc-row-list">
            {list.map((a) => (
              <div key={a.id} className="doc-row-item">
                <span className="doc-activity-icon">
                  <CalendarIcon size={18} />
                </span>
                <div className="doc-row-main">
                  <strong>{a.doctorName ? `${a.doctorName}` : a.reason || 'Appointment'}</strong>
                  <span>
                    {formatDate(a.appointmentDate)}
                    {a.appointmentTime ? ` · ${formatTime(a.appointmentTime)}` : ''}
                    {a.hospitalName ? (
                      <>
                        {' '}
                        · <BuildingIcon size={13} /> {a.hospitalName}
                      </>
                    ) : null}
                  </span>
                  {a.reason && <span className="doc-muted">{a.reason}</span>}
                </div>
                <StatusBadge status={a.status} />
                {(a.status === 'scheduled' || a.status === 'confirmed') && (
                  <button type="button" className="doc-btn doc-btn-sm doc-btn-ghost" onClick={() => setCancelId(a.id)}>
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={open}
        title="Book an appointment"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="doc-btn doc-btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="appointment-form" className="doc-btn" disabled={busy || !form.appointmentDate}>
              {busy ? 'Booking…' : 'Book appointment'}
            </button>
          </>
        }
      >
        <form id="appointment-form" className="doc-grid" onSubmit={submit}>
          <Field label="Doctor">
            <select value={form.doctorId} onChange={(e) => set('doctorId', e.target.value)}>
              <option value="">Any available doctor</option>
              {(doctors.data || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.specialization ? ` — ${d.specialization}` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hospital">
            <select value={form.hospitalId} onChange={(e) => set('hospitalId', e.target.value)}>
              <option value="">Select a hospital</option>
              {(hospitals.data || []).map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="doc-grid doc-grid-2">
            <Field label="Date" required>
              <input type="date" value={form.appointmentDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => set('appointmentDate', e.target.value)} required />
            </Field>
            <Field label="Time">
              <input type="time" value={form.appointmentTime} onChange={(e) => set('appointmentTime', e.target.value)} />
            </Field>
          </div>
          <Field label="Reason">
            <textarea rows={3} value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Briefly describe the reason for your visit" />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelId)}
        title="Cancel appointment?"
        message="This will cancel your scheduled appointment. You can book a new one anytime."
        confirmLabel="Cancel appointment"
        tone="danger"
        busy={busy}
        onConfirm={confirmCancel}
        onCancel={() => setCancelId(null)}
      />
    </div>
  )
}

export default Appointments
