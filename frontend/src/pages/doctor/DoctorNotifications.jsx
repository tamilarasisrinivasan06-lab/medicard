import { useState } from 'react'
import { getDoctorNotifications, markDoctorNotificationRead, markAllDoctorNotificationsRead } from '../../api'
import { useAsync, useToast, Card, Loading, Alert, EmptyState, PageHeader, formatDateTime } from '../../components/doctor/ui'
import { BellIcon, CheckIcon } from '../../components/doctor/icons'

function DoctorNotifications() {
  const { notify } = useToast()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, reload } = useAsync(() => getDoctorNotifications(unreadOnly), [unreadOnly])
  const list = data || []
  const unreadCount = list.filter((n) => !n.isRead).length

  async function markRead(item) {
    const res = await markDoctorNotificationRead(item.id)
    if (res.success) reload()
    else notify(res.message || 'Could not mark as read', 'error')
  }

  async function markAll() {
    setBusy(true)
    const res = await markAllDoctorNotificationsRead()
    setBusy(false)
    if (res.success) {
      notify('All notifications marked as read')
      reload()
    } else {
      notify(res.message || 'Could not mark all as read', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Access decisions, lab updates and patient activity."
        actions={
          <>
            <label className="doc-switch">
              <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
              <span>Unread only</span>
            </label>
            <button className="doc-btn doc-btn-ghost" onClick={markAll} disabled={busy || unreadCount === 0}>
              <CheckIcon size={16} /> Mark all read
            </button>
          </>
        }
      />

      {error && <Alert>{error}</Alert>}

      <Card>
        {loading ? (
          <Loading label="Loading notifications…" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<BellIcon size={26} />}
            title={unreadOnly ? 'No unread notifications' : 'No notifications'}
            message="You are all caught up."
          />
        ) : (
          <div className="doc-notif-list">
            {list.map((n) => (
              <div className={`doc-notif${n.isRead ? '' : ' is-unread'}`} key={n.id}>
                <div className="doc-notif-dot" />
                <div className="doc-notif-body">
                  <div className="doc-notif-head">
                    <strong>{n.title}</strong>
                    <span className="doc-muted" style={{ fontSize: 12.5 }}>{formatDateTime(n.createdAt)}</span>
                  </div>
                  {n.body && <p>{n.body}</p>}
                </div>
                {!n.isRead && (
                  <button className="doc-btn doc-btn-ghost doc-btn-sm" onClick={() => markRead(n)}>
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}

export default DoctorNotifications