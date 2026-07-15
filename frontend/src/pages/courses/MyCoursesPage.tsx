import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyEnrolments, updateProgress } from '../../api/enrolments'
import type { Enrolment } from '../../types/enrolment'
import { StatusBadge } from '../../components/StatusBadge'

export function MyCoursesPage() {
  const [enrolments, setEnrolments] = useState<Enrolment[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      setEnrolments(await getMyEnrolments())
    } catch {
      setError('Could not load your enrolments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const bumpProgress = async (enrolment: Enrolment, next: number) => {
    try {
      const updated = await updateProgress(enrolment.id, next)
      setEnrolments((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    } catch {
      setError('Progress update failed.')
    }
  }

  return (
    <section className="fade-rise">
      <h1 className="font-display text-3xl text-ink">My Courses</h1>
      <p className="mt-1 text-ink-soft">Track progress and move into quiz when ready.</p>
      {error && <p className="mt-3 text-sm text-alert">{error}</p>}
      {loading && <p className="mt-6 text-ink-soft">Loading…</p>}

      <ul className="mt-8 space-y-8">
        {enrolments.map((enrolment) => (
          <li key={enrolment.id} className="border-b border-line pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-ink">{enrolment.course.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={enrolment.status} />
                  <span className="text-xs text-ink-soft">
                    {enrolment.progressPercentage}% complete
                  </span>
                </div>
              </div>
              {enrolment.status === 'PENDING_QUIZ' && (
                <Link
                  to={`/app/quiz/${enrolment.course.id}`}
                  className="btn-press rounded-md bg-spark px-4 py-2 text-sm font-medium text-ink"
                >
                  Take quiz
                </Link>
              )}
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-arc transition-all"
                style={{ width: `${enrolment.progressPercentage}%` }}
              />
            </div>

            {enrolment.status !== 'PASSED' && enrolment.status !== 'PENDING_QUIZ' && (
              <div className="mt-4 flex flex-wrap gap-2">
                {[25, 50, 75, 100].map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={enrolment.progressPercentage >= value}
                    onClick={() => void bumpProgress(enrolment, value)}
                    className="rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  >
                    Mark {value}%
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {!loading && enrolments.length === 0 && (
        <p className="mt-8 text-ink-soft">
          No enrolments yet.{' '}
          <Link to="/app/courses" className="text-arc-deep underline">
            Browse the catalogue
          </Link>
          .
        </p>
      )}
    </section>
  )
}
