import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoctorPatients } from '../../api'
import { useAsync, Card, Loading, Alert, EmptyState, StatusBadge, PageHeader, formatDate } from '../../components/doctor/ui'
import { PatientsIcon, SearchIcon, ScanIcon, PlusIcon } from '../../components/doctor/icons'

function ageFromDob(dob) {
  if (!dob) return '—'
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return '—'
  const diff = Date.now() - birth.getTime()
  return `${Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))} yrs`
}

function DoctorPatients() {
  const { data, loading, error } = useAsync(() => getDoctorPatients(), [])
  const [query, setQuery] = useState('')

  const patients = useMemo(() => {
    const list = data || []
    if (!query.trim()) return list
    const q = query.trim().toLowerCase()
    return list.filter(
      (p) =>
        (p.patientName || '').toLowerCase().includes(q) ||
        (p.medicardId || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q)
    )
  }, [data, query])

  return (
    <>
      <PageHeader
        title="My Patients"
        subtitle="Patients who have approved your access request. Access is time-limited and revocable by the patient."
        actions={
          <Link className="doc-btn" to="/doctor/scan">
            <PlusIcon size={16} /> Request access
          </Link>
        }
      />

      {error && <Alert>{error}</Alert>}

      <Card
        title={`${patients.length} authorized patient${patients.length === 1 ? '' : 's'}`}
        actions={
          <label className="doc-search">
            <SearchIcon size={16} />
            <input type="search" placeholder="Search name, MediCard, city" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        }
      >
        {loading ? (
          <Loading label="Loading patients…" />
        ) : patients.length === 0 ? (
          <EmptyState
            icon={<PatientsIcon size={26} />}
            title={query ? 'No matching patients' : 'No authorized patients yet'}
            message={
              query
                ? 'Try a different search term.'
                : 'Request access from a patient using their MediCard ID. Once they approve, they appear here.'
            }
            action={
              !query && (
                <Link className="doc-btn doc-btn-sm" to="/doctor/scan">
                  <ScanIcon size={15} /> Scan Patient Card
                </Link>
              )
            }
          />
        ) : (
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>MediCard ID</th>
                  <th>Age / Gender</th>
                  <th>Records</th>
                  <th>Last Consultation</th>
                  <th>Access Expires</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.patientId}>
                    <td>
                      <strong>{p.patientName || `Patient #${p.patientId}`}</strong>
                      {p.city && <div className="doc-muted" style={{ fontSize: 12.5 }}>{[p.city, p.state].filter(Boolean).join(', ')}</div>}
                    </td>
                    <td>
                      <span className="doc-code">{p.medicardId}</span>
                    </td>
                    <td>
                      {ageFromDob(p.dateOfBirth)} · {p.gender || '—'}
                    </td>
                    <td>{p.recordCount}</td>
                    <td>{p.lastConsultation ? formatDate(p.lastConsultation) : <span className="doc-muted">None</span>}</td>
                    <td>
                      <StatusBadge status="accepted" /> <span className="doc-muted" style={{ fontSize: 12 }}>{formatDate(p.expiresAt)}</span>
                    </td>
                    <td className="doc-table-actions">
                      <Link className="doc-btn doc-btn-ghost doc-btn-sm" to={`/doctor/patients/${p.patientId}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

export default DoctorPatients