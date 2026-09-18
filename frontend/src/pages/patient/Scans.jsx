import { getPatientPortalScans } from '../../api'
import { Card, Loading, Alert, EmptyState, FileLink, useAsync, formatDate } from '../../components/doctor/ui'
import { ScanIcon, BuildingIcon } from '../../components/doctor/icons'

function Scans() {
  const { data, loading, error } = useAsync(() => getPatientPortalScans(), [])

  if (loading) return <Loading label="Loading scans…" />
  if (error) return <Alert>{error}</Alert>

  const list = data || []

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>Scans & Imaging</h1>
          <p>Radiology and imaging records linked to your profile.</p>
        </div>
      </header>

      {list.length === 0 ? (
        <EmptyState icon={<ScanIcon size={28} />} title="No scans on file" message="Imaging records shared by your doctors will appear here." />
      ) : (
        <Card>
          <div className="doc-row-list">
            {list.map((scan) => (
              <div key={scan.id} className="doc-row-item">
                <span className="doc-activity-icon">
                  <ScanIcon size={18} />
                </span>
                <div className="doc-row-main">
                  <strong>{scan.title}</strong>
                  <span>{scan.description || scan.diagnosis || 'Imaging record'}</span>
                  <span className="doc-muted">
                    {formatDate(scan.recordDate)}
                    {scan.doctorName ? ` · ${scan.doctorName}` : ''}
                    {scan.hospitalName ? (
                      <>
                        {' '}
                        · <BuildingIcon size={13} /> {scan.hospitalName}
                      </>
                    ) : null}
                  </span>
                </div>
                {scan.fileUrl && <FileLink url={scan.fileUrl}>Open scan</FileLink>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default Scans
