import { Link } from 'react-router-dom'
import { getDoctorHospital } from '../../api'
import { useAsync, Card, Loading, Alert, EmptyState, PageHeader } from '../../components/doctor/ui'
import { BuildingIcon, StethoscopeIcon, UserIcon } from '../../components/doctor/icons'

function DoctorHospital() {
  const { data, loading, error } = useAsync(() => getDoctorHospital(), [])

  if (loading) return <Loading label="Loading hospital details…" />

  const hospital = data?.hospital
  const colleagues = data?.colleagues || []
  const doctor = data?.doctor

  return (
    <>
      <PageHeader title="My Hospital / Clinic" subtitle="Your affiliated institution and colleagues." />

      {error && <Alert>{error}</Alert>}

      {hospital ? (
        <div className="doc-grid doc-grid-2">
          <Card title={hospital.name} subtitle="Institution details">
            <div className="doc-detail-grid">
              <Row label="Address" value={hospital.address} />
              <Row label="City" value={hospital.city} />
              <Row label="State" value={hospital.state} />
              <Row label="Pincode" value={hospital.pincode} />
              <Row label="Phone" value={hospital.phone} />
              <Row label="Email" value={hospital.email} />
              <Row label="Website" value={hospital.website} />
            </div>
          </Card>

          <Card title={`Colleagues (${colleagues.length})`} subtitle="Other doctors at this institution">
            {colleagues.length ? (
              <div className="doc-timeline">
                {colleagues.map((c) => (
                  <div className="doc-timeline-item" key={c.id}>
                    <span className="doc-timeline-dot">
                      <StethoscopeIcon size={16} />
                    </span>
                    <div className="doc-timeline-body">
                      <div className="doc-timeline-head">
                        <strong>{c.name}</strong>
                      </div>
                      <p className="doc-muted">{c.specialization || 'Doctor'}{c.qualification ? ` · ${c.qualification}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<UserIcon size={24} />} title="No colleagues listed" message="No other doctors are associated with this institution." />
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<BuildingIcon size={26} />}
            title="No hospital assigned"
            message={
              doctor
                ? 'You are not currently linked to a hospital or clinic. Update your profile to select one.'
                : 'No institution information is available for your account.'
            }
            action={
              <Link className="doc-btn doc-btn-sm" to="/doctor/profile">
                Update profile
              </Link>
            }
          />
        </Card>
      )}
    </>
  )
}

function Row({ label, value }) {
  return (
    <div className="doc-detail-row">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  )
}

export default DoctorHospital