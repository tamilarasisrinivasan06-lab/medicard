import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getRole, getToken, logout } from '../../api'
import { useToast, Card, PageHeader, Alert } from '../../components/doctor/ui'
import { BellIcon, ShieldIcon, LogoutIcon, CheckIcon } from '../../components/doctor/icons'

const STORAGE_KEY = 'medicardDoctorPrefs'
const DEFAULT_PREFS = {
  accessDecisions: true,
  labUpdates: true,
  followUpReminders: true,
  weeklySummary: false,
}

function readPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return DEFAULT_PREFS
  }
}

function DoctorSettings() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [prefs, setPrefs] = useState(readPrefs)

  function toggle(key) {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
    notify('Preference saved')
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your preferences and session." />

      <div className="doc-grid doc-grid-2">
        <Card title="Notification preferences" subtitle="Stored on this device">
          <div className="doc-pref-list">
            <PrefRow
              label="Access request decisions"
              hint="When a patient approves or rejects your request"
              checked={prefs.accessDecisions}
              onToggle={() => toggle('accessDecisions')}
            />
            <PrefRow
              label="Lab updates"
              hint="When lab reports are added"
              checked={prefs.labUpdates}
              onToggle={() => toggle('labUpdates')}
            />
            <PrefRow
              label="Follow-up reminders"
              hint="Reminders for upcoming and due follow-ups"
              checked={prefs.followUpReminders}
              onToggle={() => toggle('followUpReminders')}
            />
            <PrefRow
              label="Weekly summary"
              hint="A weekly digest of your activity"
              checked={prefs.weeklySummary}
              onToggle={() => toggle('weeklySummary')}
            />
          </div>
          <p className="doc-note doc-flex" style={{ gap: 8, marginTop: 8 }}>
            <BellIcon size={15} /> In-app notifications are always shown in your notification centre.
          </p>
        </Card>

        <Card title="Account & security" subtitle="Your session information">
          <div className="doc-detail-grid">
            <div className="doc-detail-row">
              <span>Role</span>
              <strong style={{ textTransform: 'capitalize' }}>{getRole() || 'doctor'}</strong>
            </div>
            <div className="doc-detail-row">
              <span>Session</span>
              <strong>{getToken() ? 'Active' : 'Signed out'}</strong>
            </div>
            <div className="doc-detail-row">
              <span>Patient access</span>
              <strong>24-hour, patient-approved</strong>
            </div>
          </div>
          <Alert tone="info">
            <ShieldIcon size={16} /> All patient data access is audit-logged. Revoke access you no longer need.
          </Alert>
          <div className="doc-inline-actions doc-mt">
            <Link className="doc-btn doc-btn-ghost" to="/doctor/access-requests">
              Manage access requests
            </Link>
            <button className="doc-btn doc-btn-danger" onClick={handleLogout}>
              <LogoutIcon size={16} /> Sign out
            </button>
          </div>
        </Card>
      </div>
    </>
  )
}

function PrefRow({ label, hint, checked, onToggle }) {
  return (
    <button type="button" className="doc-pref-row" onClick={onToggle}>
      <div>
        <strong>{label}</strong>
        <p className="doc-muted">{hint}</p>
      </div>
      <span className={`doc-toggle${checked ? ' is-on' : ''}`}>
        <span className="doc-toggle-knob">{checked && <CheckIcon size={12} />}</span>
      </span>
    </button>
  )
}

export default DoctorSettings