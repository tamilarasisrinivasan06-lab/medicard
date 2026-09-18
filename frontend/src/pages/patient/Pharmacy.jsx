import { getPatientPortalPharmacy } from '../../api'
import { Card, StatCard, Loading, Alert, EmptyState, StatusBadge, useAsync, formatDate, formatDateTime } from '../../components/doctor/ui'
import { StoreIcon, PillIcon, BuildingIcon, CheckIcon, ClockIcon } from '../../components/doctor/icons'

function Pharmacy() {
  const { data, loading, error } = useAsync(() => getPatientPortalPharmacy(), [])

  if (loading) return <Loading label="Loading pharmacy records…" />
  if (error) return <Alert>{error}</Alert>

  const list = data || []
  const pending = list.filter((p) => p.status === 'pending').length
  const dispensed = list.filter((p) => p.status === 'dispensed').length

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>Pharmacy</h1>
          <p>Track your prescriptions from collection to dispensing.</p>
        </div>
      </header>

      <div className="doc-stats doc-stats-3">
        <StatCard icon={<PillIcon size={20} />} label="Total prescriptions" value={list.length} tone="accent" />
        <StatCard icon={<ClockIcon size={20} />} label="Awaiting dispensing" value={pending} tone="amber" />
        <StatCard icon={<CheckIcon size={20} />} label="Dispensed" value={dispensed} tone="green" />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<StoreIcon size={28} />} title="No prescriptions" message="Your prescriptions will appear here." />
      ) : (
        <Card>
          <div className="doc-row-list">
            {list.map((p) => (
              <div key={p.id} className="doc-row-item">
                <span className="doc-activity-icon">
                  <PillIcon size={18} />
                </span>
                <div className="doc-row-main">
                  <strong>{p.diagnosis || 'Prescription'}</strong>
                  <span>
                    {p.itemCount} medicine{p.itemCount === 1 ? '' : 's'}
                    {p.doctorName ? ` · ${p.doctorName}` : ''}
                  </span>
                  <span className="doc-muted">
                    {p.hospitalName ? (
                      <>
                        <BuildingIcon size={13} /> {p.hospitalName} ·{' '}
                      </>
                    ) : null}
                    {formatDate(p.prescriptionDate)}
                    {p.status === 'dispensed' && p.dispensedAt ? ` · dispensed ${formatDateTime(p.dispensedAt)}` : ''}
                  </span>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default Pharmacy
