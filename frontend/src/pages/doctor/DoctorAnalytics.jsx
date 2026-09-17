import { useState } from 'react'
import { getDoctorAnalytics } from '../../api'
import { useAsync, Card, Loading, Alert, EmptyState, StatusBadge, StatCard, PageHeader } from '../../components/doctor/ui'
import { ChartIcon, StethoscopeIcon, FlaskIcon } from '../../components/doctor/icons'

const RANGES = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
]

function DoctorAnalytics() {
  const [range, setRange] = useState('all')
  const { data, loading, error } = useAsync(() => getDoctorAnalytics(range === 'all' ? undefined : range), [range])

  const summary = data?.summary || { consultations: 0, labRequests: 0 }
  const monthly = data?.monthly || []
  const byStatus = data?.byStatus || []
  const topDiagnoses = data?.topDiagnoses || []

  const maxMonthly = Math.max(1, ...monthly.map((m) => m.count))
  const maxDiagnosis = Math.max(1, ...topDiagnoses.map((d) => d.count))
  const totalStatus = Math.max(1, byStatus.reduce((sum, s) => sum + s.count, 0))

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Insights into your consultations, lab activity and diagnoses."
        actions={
          <div className="doc-filter-row">
            {RANGES.map((r) => (
              <button key={r.value} className={`doc-chip-btn${range === r.value ? ' is-active' : ''}`} onClick={() => setRange(r.value)}>
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {error && <Alert>{error}</Alert>}
      {loading ? (
        <Loading label="Crunching your numbers…" />
      ) : (
        <>
          <div className="doc-stats doc-stats-2">
            <StatCard icon={<StethoscopeIcon size={22} />} label="Consultations" value={summary.consultations} />
            <StatCard icon={<FlaskIcon size={22} />} label="Lab requests" value={summary.labRequests} tone="amber" />
          </div>

          <div className="doc-grid doc-grid-2">
            <Card title="Consultations by month" subtitle={`Range: ${data?.range || 'all'}`}>
              {monthly.length ? (
                <div className="doc-bar-list">
                  {monthly.map((m) => (
                    <div className="doc-bar-row" key={m.month}>
                      <span className="doc-bar-label">{m.month}</span>
                      <div className="doc-bar-track">
                        <div className="doc-bar-fill" style={{ width: `${(m.count / maxMonthly) * 100}%` }} />
                      </div>
                      <span className="doc-bar-value">{m.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<ChartIcon size={24} />} title="No data" message="No consultations in this range." />
              )}
            </Card>

            <Card title="Consultations by status" subtitle="Distribution across statuses">
              {byStatus.length ? (
                <div className="doc-status-list">
                  {byStatus.map((s) => (
                    <div className="doc-status-item" key={s.status}>
                      <div className="doc-flex-between">
                        <StatusBadge status={s.status} />
                        <strong>{s.count}</strong>
                      </div>
                      <div className="doc-bar-track">
                        <div className="doc-bar-fill doc-bar-accent" style={{ width: `${(s.count / totalStatus) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<ChartIcon size={24} />} title="No data" message="No consultations in this range." />
              )}
            </Card>

            <Card title="Top diagnoses" subtitle="Most frequent in the selected range" className="doc-span-2">
              {topDiagnoses.length ? (
                <div className="doc-bar-list">
                  {topDiagnoses.map((d) => (
                    <div className="doc-bar-row" key={d.diagnosis}>
                      <span className="doc-bar-label doc-bar-label-wide" title={d.diagnosis}>{d.diagnosis}</span>
                      <div className="doc-bar-track">
                        <div className="doc-bar-fill doc-bar-green" style={{ width: `${(d.count / maxDiagnosis) * 100}%` }} />
                      </div>
                      <span className="doc-bar-value">{d.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<ChartIcon size={24} />} title="No diagnoses recorded" message="Diagnoses you enter in consultations will be summarised here." />
              )}
            </Card>
          </div>
        </>
      )}
    </>
  )
}

export default DoctorAnalytics