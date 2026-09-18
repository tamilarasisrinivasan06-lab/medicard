import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { searchPatientPortal } from '../../api'
import { Card, Loading, Alert, EmptyState, useAsync, formatDate } from '../../components/doctor/ui'
import {
  SearchIcon,
  StethoscopeIcon,
  PillIcon,
  FlaskIcon,
  FolderIcon,
  UserCheckIcon,
  ReportIcon,
} from '../../components/doctor/icons'

const TYPE_META = {
  consultation: { label: 'Consultation', icon: StethoscopeIcon },
  prescription: { label: 'Prescription', icon: PillIcon },
  lab_report: { label: 'Lab report', icon: FlaskIcon },
  record: { label: 'Medical record', icon: FolderIcon },
  document: { label: 'Document', icon: ReportIcon },
  doctor: { label: 'Doctor', icon: UserCheckIcon },
}

function Search() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') || ''
  const { data, loading, error } = useAsync(
    () => (q.length >= 2 ? searchPatientPortal(q) : Promise.resolve({ data: [] })),
    [q]
  )

  const results = data || []

  function submit(event) {
    event.preventDefault()
    const next = event.currentTarget.elements.q.value.trim()
    if (next.length >= 2) navigate(`/patient/search?q=${encodeURIComponent(next)}`)
  }

  return (
    <div className="doc-page">
      <header className="doc-page-head">
        <div>
          <h1>Search</h1>
          <p>Find records, prescriptions, reports and doctors.</p>
        </div>
      </header>

      <div className="doc-toolbar">
        <form className="doc-search doc-search-hero" onSubmit={submit}>
          <SearchIcon size={16} />
          <input
            key={q}
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search your medical data"
            autoFocus
          />
        </form>
      </div>

      {loading && <Loading label="Searching…" />}
      {error && <Alert>{error}</Alert>}

      {!loading && q.length < 2 && (
        <EmptyState icon={<SearchIcon size={28} />} title="Start typing" message="Enter at least two characters to search." />
      )}

      {!loading && q.length >= 2 && results.length === 0 && (
        <EmptyState icon={<SearchIcon size={28} />} title="No matches" message={`Nothing matched “${q}”.`} />
      )}

      {results.length > 0 && (
        <Card title={`Results for “${q}”`} subtitle={`${results.length} match${results.length === 1 ? '' : 'es'}`}>
          <div className="doc-row-list">
            {results.map((r, index) => {
              const meta = TYPE_META[r.type] || TYPE_META.record
              const Icon = meta.icon
              return (
                <div key={`${r.type}-${r.id}-${index}`} className="doc-row-item">
                  <span className="doc-activity-icon">
                    <Icon size={18} />
                  </span>
                  <div className="doc-row-main">
                    <strong>{r.title}</strong>
                    <span>{r.subtitle || meta.label}</span>
                    <span className="doc-muted">
                      <span className="doc-tag">{meta.label}</span>{' '}
                      {r.doctorName ? `${r.doctorName}` : ''}
                      {r.date ? ` · ${formatDate(r.date)}` : ''}
                    </span>
                  </div>
                  {r.type === 'doctor' && (
                    <Link to={`/patient/doctors/${r.id}`} className="doc-btn doc-btn-sm doc-btn-ghost">
                      View
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

export default Search
