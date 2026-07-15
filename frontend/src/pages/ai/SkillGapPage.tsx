import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { listCourses } from '../../api/courses'
import { analyzeSkillGap } from '../../api/skillGap'
import { listTeams, type TeamSummary } from '../../api/teams'
import { useAuthStore } from '../../store/authStore'
import type { Course } from '../../types/course'

export function SkillGapPage() {
  const user = useAuthStore((s) => s.user)
  const hydrateProfile = useAuthStore((s) => s.hydrateProfile)
  const [courses, setCourses] = useState<Course[]>([])
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [teamId, setTeamId] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [frameworkName, setFrameworkName] = useState('Compliance track')
  const [result, setResult] = useState<Awaited<ReturnType<typeof analyzeSkillGap>> | null>(
    null,
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isHr = user?.role === 'HR_ADMIN'

  useEffect(() => {
    void (async () => {
      try {
        if (!useAuthStore.getState().user?.team?.id) {
          await hydrateProfile()
        }
        const profile = useAuthStore.getState().user
        setCourses(await listCourses())
        if (profile?.role === 'HR_ADMIN') {
          const all = await listTeams()
          setTeams(all)
          setTeamId((prev) => prev || profile.team?.id || all[0]?.id || '')
        } else {
          setTeamId(profile?.team?.id ?? '')
        }
      } catch {
        setError('Could not load skill-gap inputs.')
      }
    })()
  }, [hydrateProfile, user?.role, user?.team?.id])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!teamId) {
      setError('Select a team to analyse.')
      return
    }
    if (!selected.size) {
      setError('Select at least one required course.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await analyzeSkillGap({
        teamId,
        requiredCourseIds: [...selected],
        frameworkName,
      })
      setResult(data)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Analysis failed.'
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="fade-rise max-w-3xl">
      <h1 className="font-display text-3xl text-ink">Skill gap analyser</h1>
      <p className="mt-1 text-ink-soft">
        Pick a competency framework (required courses) against a team.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {isHr ? (
          <label className="block text-sm font-medium">
            Team
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2"
              required
            >
              <option value="">Select team…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.department ? ` (${t.department.name})` : ''}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-ink-soft">
            Analysing team:{' '}
            <span className="font-medium text-ink">{user?.team?.name ?? 'not assigned'}</span>
          </p>
        )}

        <label className="block text-sm font-medium">
          Framework name
          <input
            value={frameworkName}
            onChange={(e) => setFrameworkName(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2"
          />
        </label>
        <div>
          <p className="text-sm font-medium">Required courses</p>
          <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
            {courses.map((c) => (
              <li key={c.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  {c.title}
                </label>
              </li>
            ))}
          </ul>
        </div>
        {error && <p className="text-sm text-alert">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-press rounded-md bg-ink px-4 py-2.5 text-sm text-spark"
        >
          {loading ? 'Analysing…' : 'Run analysis'}
        </button>
      </form>

      {result && (
        <div className="mt-10">
          <p className="text-xs uppercase tracking-wide text-arc-deep">
            {result.source}
            {result.fallbackReason ? ` · ${result.fallbackReason}` : ''}
          </p>
          <p className="mt-2 text-ink">{result.summary}</p>
          <h2 className="mt-6 font-display text-xl text-ink">Team summary (priority order)</h2>
          <ul className="mt-3 space-y-3">
            {result.teamSummary.map((s) => (
              <li key={s.courseId} className="border-b border-line pb-3 text-sm">
                <p className="font-medium">
                  #{s.urgencyRank} {s.courseTitle} — {s.teamCoverage}
                </p>
                <p className="text-ink-soft">
                  Covered {s.coveredCount} · Partial {s.partiallyCoveredCount} · Missing{' '}
                  {s.missingCount}
                </p>
                {s.aiRationale && <p className="mt-1 text-arc-deep">{s.aiRationale}</p>}
              </li>
            ))}
          </ul>
          <h2 className="mt-8 font-display text-xl text-ink">Individuals</h2>
          <ul className="mt-3 space-y-4">
            {result.individualBreakdown.map((p) => (
              <li key={p.employeeId} className="text-sm">
                <p className="font-medium">{p.employeeName}</p>
                <p className="text-ink-soft">
                  {p.coveredCount} covered · {p.partiallyCoveredCount} partial · {p.missingCount}{' '}
                  missing
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
