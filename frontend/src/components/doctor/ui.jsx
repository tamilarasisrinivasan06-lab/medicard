/* oxlint-disable react/only-export-components -- shared UI kit also exports formatting helpers and hooks */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CloseIcon, AlertIcon, InboxIcon } from './icons'

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatTime(value) {
  if (!value) return '—'
  const [h, m] = String(value).split(':')
  const d = new Date()
  d.setHours(Number(h), Number(m || 0), 0, 0)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function statusLabel(status) {
  if (!status) return '—'
  return String(status).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function Card({ title, subtitle, actions, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`doc-card ${className}`}>
      {(title || actions) && (
        <header className="doc-card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="doc-card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="doc-card-actions">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

export function StatCard({ icon, label, value, hint, tone = 'accent' }) {
  return (
    <div className={`doc-stat doc-stat-${tone}`}>
      <span className="doc-stat-icon">{icon}</span>
      <div className="doc-stat-body">
        <strong className="doc-stat-value">{value ?? '—'}</strong>
        <span className="doc-stat-label">{label}</span>
        {hint && <span className="doc-stat-hint">{hint}</span>}
      </div>
    </div>
  )
}

export function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase()
  return <span className={`doc-badge doc-badge-${s}`}>{statusLabel(status)}</span>
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="doc-empty">
      <span className="doc-empty-icon">{icon || <InboxIcon size={28} />}</span>
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {action && <div className="doc-empty-action">{action}</div>}
    </div>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="doc-loading">
      <span className="doc-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function Alert({ tone = 'error', children }) {
  if (!children) return null
  return (
    <div className={`doc-alert doc-alert-${tone}`}>
      <AlertIcon size={18} />
      <span>{children}</span>
    </div>
  )
}

export function Field({ label, required, hint, children, className = '' }) {
  return (
    <label className={`doc-field ${className}`}>
      {label && (
        <span className="doc-field-label">
          {label} {required && <em className="doc-required">*</em>}
        </span>
      )}
      {children}
      {hint && <span className="doc-field-hint">{hint}</span>}
    </label>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="doc-page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="doc-page-actions">{actions}</div>}
    </header>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="doc-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={active === tab.value}
          className={active === tab.value ? 'is-active' : ''}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({ open, title, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.key === 'Escape' && onClose) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="doc-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onClose) onClose()
      }}
    >
      <div className={`doc-modal doc-modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="doc-modal-head">
          <h3>{title}</h3>
          <button type="button" className="doc-icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </header>
        <div className="doc-modal-body">{children}</div>
        {footer && <footer className="doc-modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Confirm', tone = 'accent', onConfirm, onCancel, busy }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button type="button" className="doc-btn doc-btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`doc-btn doc-btn-${tone}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="doc-confirm-text">{message}</p>
    </Modal>
  )
}

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  const notify = useCallback(
    (message, tone = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      setToasts((prev) => [...prev, { id, message, tone }])
      timers.current[id] = setTimeout(() => remove(id), 4200)
    },
    [remove]
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      Object.values(pending).forEach(clearTimeout)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="doc-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`doc-toast doc-toast-${t.tone}`}>
            <span>{t.message}</span>
            <button type="button" className="doc-icon-btn" onClick={() => remove(t.id)} aria-label="Dismiss">
              <CloseIcon size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  return ctx || { notify: () => {} }
}

export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ loading: true, error: '', data: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: '' }))
    loader()
      .then((result) => {
        if (cancelled) return
        if (result && result.success === false) {
          setState({ loading: false, error: result.message || 'Request failed', data: null })
        } else {
          setState({ loading: false, error: '', data: result && result.data !== undefined ? result.data : result })
        }
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, error: 'Could not reach the backend. Is it running?', data: null })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey])

  return { ...state, reload: () => setReloadKey((k) => k + 1) }
}