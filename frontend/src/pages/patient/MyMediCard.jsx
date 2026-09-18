import { getPatientPortalMedicard } from '../../api'
import { Card, Loading, Alert, useAsync, formatDate } from '../../components/doctor/ui'
import { QrIcon, ShieldIcon } from '../../components/doctor/icons'

function MyMediCard() {
  const { data, loading, error } = useAsync(() => getPatientPortalMedicard(), [])

  if (loading) return <Loading label="Loading your Medi Card…" />
  if (error) return <Alert>{error}</Alert>
  if (!data) return null

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>My Medi Card</h1>
          <p>Your portable medical identity. Present the QR code to an authorised provider.</p>
        </div>
        {data.qrDataUrl && (
          <div className="doc-page-actions">
            <a className="doc-btn doc-btn-ghost" href={data.qrDataUrl} download={`${data.medicardId || 'medicard'}-qr.png`}>
              Download QR
            </a>
          </div>
        )}
      </header>

      <div className="doc-grid doc-grid-2">
        <div className="doc-qr-card">
          <div className="doc-qr-code">
            {data.qrDataUrl ? <img src={data.qrDataUrl} alt="Medi Card QR code" /> : <QrIcon size={80} />}
          </div>
          <div className="doc-qr-wrap">
            <span className="doc-tag doc-tag-green">Active</span>
            <h2 style={{ margin: '10px 0 2px' }}>{data.medicardId || '—'}</h2>
            <p className="doc-muted">{data.name}</p>
          </div>
        </div>

        <div className="doc-grid">
          <Card title="Card details">
            <div className="doc-detail-grid">
              <div className="doc-detail-row">
                <span>Medi Card ID</span>
                <strong>{data.medicardId || '—'}</strong>
              </div>
              <div className="doc-detail-row">
                <span>Blood group</span>
                <strong>{data.bloodGroup || 'Not set'}</strong>
              </div>
              <div className="doc-detail-row">
                <span>Date of birth</span>
                <strong>{formatDate(data.dateOfBirth)}</strong>
              </div>
              <div className="doc-detail-row">
                <span>Gender</span>
                <strong>{data.gender || 'Not set'}</strong>
              </div>
              <div className="doc-detail-row">
                <span>Issued</span>
                <strong>{formatDate(data.cardIssued)}</strong>
              </div>
              <div className="doc-detail-row">
                <span>Emergency contact</span>
                <strong>{data.phone || 'Not set'}</strong>
              </div>
            </div>
          </Card>

          <Card>
            <div className="doc-timeline-item">
              <span className="doc-timeline-dot" />
              <div className="doc-timeline-body">
                <div className="doc-timeline-head">
                  <strong>
                    <ShieldIcon size={15} /> Your privacy is protected
                  </strong>
                </div>
                <p className="doc-muted">
                  Merely scanning or entering your Medi Card number never grants a doctor access. You receive an explicit
                  request and decide whether to accept or reject it. Accepted access expires automatically.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default MyMediCard
