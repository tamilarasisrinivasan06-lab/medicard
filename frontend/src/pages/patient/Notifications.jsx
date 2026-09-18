import { useOutletContext } from 'react-router-dom'
import {
  getPatientPortalNotifications,
  markPatientPortalNotificationRead,
  markAllPatientPortalNotificationsRead,
} from '../../api'
import { Card, Loading, Alert, EmptyState, useAsync, useToast, formatDateTime, statusLabel } from '../../components/doctor/ui'
import { BellIcon, CheckIcon } from '../../components/doctor/icons'

function Notifications() {
  const { setUnread } = useOutletContext() || {}
  const { notify } = useToast()
  const { data, loading, error, reload } = useAsync(() => getPatientPortalNotifications(), [])

  async function readOne(id) {
    const res = await markPatientPortalNotificationRead(id)
    if (res.success) {
      setUnread?.((prev) => Math.max(0, (prev || 1) - 1))
      reload()
    } else {
      notify(res.message || 'Could not update notification', 'error')
    }
  }

  async function readAll() {
    const res = await markAllPatientPortalNotificationsRead()
    if (res.success) {
      setUnread?.(0)
      notify('All notifications marked as read', 'success')
      reload()
    } else {
      notify(res.message || 'Could not update notifications', 'error')
    }
  }

  const list = data || []
  const unread = list.filter((n) => !n.isRead).length

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>Notifications</h1>
          <p>{unread > 0 ? `${unread} unread update${unread === 1 ? '' : 's'}` : 'You are all caught up'}</p>
        </div>
        {unread > 0 && (
          <div className="doc-page-actions">
            <button type="button" className="doc-btn doc-btn-ghost" onClick={readAll}>
              <CheckIcon size={15} /> Mark all read
            </button>
          </div>
        )}
      </header>

      {loading && <Loading label="Loading notifications…" />}
      {error && <Alert>{error}</Alert>}

      {data && list.length === 0 && (
        <EmptyState icon={<BellIcon size={28} />} title="No notifications" message="Updates about your care will appear here." />
      )}

      {list.length > 0 && (
        <Card>
          <div className="doc-row-list">
            {list.map((n) => (
              <div key={n.id} className="doc-row-item" style={n.isRead ? undefined : { background: 'rgba(59,130,246,0.04)' }}>
                <span className="doc-activity-icon">
                  <BellIcon size={18} />
                </span>
                <div className="doc-row-main">
                  <strong>{n.title}</strong>
                  <span>{n.body || statusLabel(n.type)}</span>
                  <span className="doc-muted">{formatDateTime(n.createdAt)}</span>
                </div>
                {n.isRead ? (
                  <span className="doc-tag">Read</span>
                ) : (
                  <button type="button" className="doc-btn doc-btn-sm doc-btn-ghost" onClick={() => readOne(n.id)}>
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default Notifications
