import { useEffect, useState } from 'react'
import { listCourses } from '../../api/courses'
import { selfEnrol, getMyEnrolments } from '../../api/enrolments'
import type { Course } from '../../types/course'
import { StatusBadge } from '../../components/StatusBadge'

export function CataloguePage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [mandatoryOnly, setMandatoryOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [courseList, enrolments] = await Promise.all([
        listCourses(mandatoryOnly ? { mandatory: true } : undefined),
        getMyEnrolments().catch(() => []),
      ])
      setCourses(courseList)
      setEnrolledIds(new Set(enrolments.map((e) => e.course.id)))
    } catch {
      setError('Could not load courses.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [mandatoryOnly])

  const enrol = async (courseId: string) => {
    setBusyId(courseId)
    setMessage('')
    setError('')
    try {
      await selfEnrol(courseId)
      setEnrolledIds((prev) => new Set(prev).add(courseId))
      setMessage('Enrolled successfully. Find it under My Courses.')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Enrolment failed.'
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="fade-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-arc-deep">
            Catalogue
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink">Courses</h1>
          <p className="mt-1 text-ink-soft">Browse and self-enrol into available courses.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={mandatoryOnly}
            onChange={(e) => setMandatoryOnly(e.target.checked)}
          />
          Mandatory only
        </label>
      </div>

      {message && <p className="mt-4 text-sm text-ok">{message}</p>}
      {error && <p className="mt-4 text-sm text-alert">{error}</p>}
      {loading && <p className="mt-6 text-ink-soft">Loading…</p>}

      <ul className="mt-8 space-y-6">
        {courses.map((course) => {
          const enrolled = enrolledIds.has(course.id)
          return (
            <li
              key={course.id}
              className="border-b border-line pb-6 last:border-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl text-ink">{course.title}</h2>
                    {course.isMandatory && (
                      <span className="rounded bg-alert/15 px-2 py-0.5 text-xs font-medium text-alert">
                        Mandatory
                      </span>
                    )}
                    {enrolled && <StatusBadge status="IN_PROGRESS" />}
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">{course.description}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-ink-soft">
                    {course.estimatedDuration}
                    {course.regulatoryDeadline
                      ? ` · Due ${String(course.regulatoryDeadline).slice(0, 10)}`
                      : ''}
                    {` · v${course.version}`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={enrolled || busyId === course.id}
                  onClick={() => void enrol(course.id)}
                  className="btn-press rounded-md bg-ink px-4 py-2 text-sm font-medium text-spark disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {enrolled ? 'Enrolled' : busyId === course.id ? 'Enrolling…' : 'Self-enrol'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {!loading && courses.length === 0 && (
        <p className="mt-8 text-ink-soft">No courses published yet.</p>
      )}
    </section>
  )
}
