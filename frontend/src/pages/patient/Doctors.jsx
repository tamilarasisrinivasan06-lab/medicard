import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getPatientPortalDoctors } from '../../api'
import { Card, Loading, Alert, EmptyState, StatusBadge, useAsync, formatDate, statusLabel } from '../../components/doctor/ui'
import { SearchIcon, UserCheckIcon, StethoscopeIcon, BuildingIcon } from '../../components/doctor/icons'

function Doctors() {
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const { data, loading, error } = useAsync(() => getPatientPortalDoctors(term), [term])

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>My Doctors</h1>
          <p>Doctors who have treated you or requested access to your records.</p>
        </div>
      </header>

      <div className="doc-toolbar">
        <form
          className="doc-search"
          onSubmit={(e) => {
            e.preventDefault()
            setTerm(search.trim())
          }}
        >
          <SearchIcon size={16} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, specialisation or hospital"
          />
        </form>
      </div>

      {loading && <Loading label="Loading doctors…" />}
      {error && <Alert>{error}</Alert>}

      {data && data.length === 0 && (
        <EmptyState icon={<UserCheckIcon size={28} />} title="No doctors found" message="Doctors you visit will appear here." />
      )}

      {data && data.length > 0 && (
        <Card>
          <div className="doc-row-list">
            {data.map((doc) => (
              <div key={doc.doctorId} className="doc-row-item">
                <span className="doc-avatar">{(doc.name || 'D').slice(0, 1).toUpperCase()}</span>
                <div className="doc-row-main">
                  <strong>{doc.name}</strong>
                  <span>
                    <StethoscopeIcon size={13} /> {doc.specialization || 'General physician'}
                    {doc.hospitalName ? (
                      <>
                        {' '}
                        · <BuildingIcon size={13} /> {doc.hospitalName}
                      </>
                    ) : null}
                  </span>
                  <span className="doc-muted">
                    {doc.consultations} consultation{doc.consultations === 1 ? '' : 's'}
                    {doc.lastVisit ? ` · last visit ${formatDate(doc.lastVisit)}` : ''}
                  </span>
                </div>
                {doc.accessStatus ? (
                  <StatusBadge status={doc.accessStatus} />
                ) : (
                  <span className="doc-tag">{statusLabel('no access')}</span>
                )}
                <Link to={`/patient/doctors/${doc.doctorId}`} className="doc-btn doc-btn-sm doc-btn-ghost">
                  View
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default Doctors
