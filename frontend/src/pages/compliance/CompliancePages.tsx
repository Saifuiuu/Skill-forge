import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  downloadComplianceCsv,
  getCompanyCompliance,
  getTeamCompliance,
} from '../../api/compliance'

const RISK_COLOR = { green: '#2A9D8F', amber: '#E9C46A', red: '#E85D04' }

export function TeamCompliancePage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getTeamCompliance>> | null>(
    null,
  )
  const [error, setError] = useState('')

  useEffect(() => {
    void getTeamCompliance()
      .then(setData)
      .catch(() => setError('Could not load team compliance.'))
  }, [])

  const barData = useMemo(
    () =>
      data?.courseBreakdown.map((c) => ({
        name: c.courseTitle.slice(0, 18),
        completion: c.completionRate,
      })) ?? [],
    [data],
  )

  const riskDonut = useMemo(() => {
    const counts = { green: 0, amber: 0, red: 0 }
    data?.courseBreakdown.forEach((c) => {
      c.employeeStatuses.forEach((e) => {
        counts[e.risk] += 1
      })
    })
    return [
      { name: 'On track', value: counts.green, color: RISK_COLOR.green },
      { name: 'Due soon', value: counts.amber, color: RISK_COLOR.amber },
      { name: 'Overdue', value: counts.red, color: RISK_COLOR.red },
    ]
  }, [data])

  return (
    <section className="fade-rise">
      <h1 className="font-display text-3xl text-ink">Team compliance</h1>
      <p className="mt-1 text-ink-soft">
        {error
          ? 'Unable to load team details.'
          : data
            ? `${data.teamName} · ${data.teamSize} employees`
            : 'Loading…'}
      </p>
      {error && <p className="mt-3 text-sm text-alert">{error}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="h-72">
          <p className="mb-2 text-sm font-medium text-ink">Completion by course</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#C5D5DB" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="completion" fill="#2EC4B6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-72">
          <p className="mb-2 text-sm font-medium text-ink">Risk mix</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={riskDonut} dataKey="value" nameKey="name" outerRadius={90} label>
                {riskDonut.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ul className="mt-10 space-y-6">
        {data?.courseBreakdown.map((course) => (
          <li key={course.courseId} className="border-b border-line pb-4">
            <p className="font-display text-lg text-ink">
              {course.courseTitle}{' '}
              <span className="text-sm text-ink-soft">({course.completionRate}%)</span>
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {course.employeeStatuses.map((e) => (
                <li key={e.employeeId} className="flex justify-between gap-2">
                  <span>{e.employeeName}</span>
                  <span className="text-ink-soft">
                    {e.status} · {e.risk}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CompanyCompliancePage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getCompanyCompliance>> | null>(
    null,
  )
  const [error, setError] = useState('')

  useEffect(() => {
    void getCompanyCompliance()
      .then(setData)
      .catch(() => setError('Could not load company compliance.'))
  }, [])

  const heatmapCells = useMemo(() => {
    const rows: Array<{
      key: string
      department: string
      course: string
      rate: number
      risk: string
    }> = []
    data?.heatmap.forEach((dept) => {
      dept.courses.forEach((c) => {
        rows.push({
          key: `${dept.departmentId}-${c.courseId}`,
          department: dept.departmentName,
          course: c.courseTitle,
          rate: c.completionRate,
          risk: c.risk,
        })
      })
    })
    return rows
  }, [data])

  const lineData = useMemo(() => {
    return (
      data?.heatmap.map((d) => {
        const avg =
          d.courses.length === 0
            ? 0
            : Math.round(
                d.courses.reduce((sum, c) => sum + c.completionRate, 0) / d.courses.length,
              )
        return { name: d.departmentName.slice(0, 14), avg }
      }) ?? []
    )
  }, [data])

  const onExport = async () => {
    try {
      const blob = await downloadComplianceCsv()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'compliance-report.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('CSV export failed.')
    }
  }

  const heatColor = (rate: number) => {
    if (rate >= 80) return 'bg-ok/40'
    if (rate >= 50) return 'bg-warn/50'
    return 'bg-alert/30'
  }

  return (
    <section className="fade-rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">Company compliance</h1>
          <p className="mt-1 text-ink-soft">Heatmap by department × mandatory course</p>
        </div>
        <button
          type="button"
          onClick={() => void onExport()}
          className="btn-press rounded-md bg-ink px-4 py-2 text-sm text-spark"
        >
          Export CSV
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-alert">{error}</p>}

      <div className="mt-8 overflow-x-auto">
        <div className="grid min-w-[640px] gap-2">
          {heatmapCells.map((cell) => (
            <div
              key={cell.key}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${heatColor(cell.rate)}`}
            >
              <span>
                <strong>{cell.department}</strong> · {cell.course}
              </span>
              <span className="font-medium">
                {cell.rate}% · {cell.risk}
              </span>
            </div>
          ))}
        </div>
        {!heatmapCells.length && (
          <p className="text-ink-soft">No heatmap data yet — add mandatory courses.</p>
        )}
      </div>

      <div className="mt-10 h-72">
        <p className="mb-2 text-sm font-medium text-ink">Average completion by department</p>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C5D5DB" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="avg" stroke="#07161C" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
