import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { listCourses } from '../../api/courses'
import { bulkEnrol } from '../../api/enrolments'
import { listUsers } from '../../api/users'
import { useAuthStore } from '../../store/authStore'
import type { Course } from '../../types/course'
import type { AuthUser } from '../../types/auth'

export function BulkEnrolPage() {
  const user = useAuthStore((s) => s.user)
  const hydrateProfile = useAuthStore((s) => s.hydrateProfile)
  const [courses, setCourses] = useState<Course[]>([])
  const [teamMembers, setTeamMembers] = useState<AuthUser[]>([])
  const [courseId, setCourseId] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        if (!user?.team?.id) {
          await hydrateProfile()
        }
        const [courseList, users] = await Promise.all([listCourses(), listUsers()])
        setCourses(courseList.filter((c) => c.isMandatory))
        const profile = useAuthStore.getState().user
        const teamId = profile?.team?.id
        setTeamMembers(
          users.filter(
            (u) => u.role === 'EMPLOYEE' && u.team?.id && u.team.id === teamId,
          ),
        )
      } catch {
        setError('Could not load team or courses.')
      }
    })()
  }, [user?.team?.id, hydrateProfile])

  const allSelected = useMemo(
    () => teamMembers.length > 0 && selected.size === teamMembers.length,
    [selected, teamMembers],
  )

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
    if (!courseId || selected.size === 0) {
      setError('Pick a course and at least one employee.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const created = await bulkEnrol(courseId, [...selected])
      setMessage(`Enrolled ${created.length} team member(s).`)
      setSelected(new Set())
    } catch {
      setError('Bulk enrolment failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="fade-rise max-w-2xl">
      <h1 className="font-display text-3xl text-ink">Bulk enrol</h1>
      <p className="mt-1 text-ink-soft">
        Assign a mandatory course to members of your team.
      </p>
      {message && <p className="mt-3 text-sm text-ok">{message}</p>}
      {error && <p className="mt-3 text-sm text-alert">{error}</p>}

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <label className="block text-sm font-medium">
          Mandatory course
          <select
            required
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2"
          >
            <option value="">Select…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Team members</p>
            <button
              type="button"
              className="text-xs text-arc-deep underline"
              onClick={() =>
                setSelected(
                  allSelected ? new Set() : new Set(teamMembers.map((m) => m.id)),
                )
              }
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <ul className="space-y-2">
            {teamMembers.map((member) => (
              <li key={member.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-line bg-panel px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(member.id)}
                    onChange={() => toggle(member.id)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">
                      {member.fullName}
                    </span>
                    <span className="text-xs text-ink-soft">{member.email}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {teamMembers.length === 0 && (
            <p className="text-sm text-ink-soft">
              No employees found on your team. Assign employees to your team in the
              backend seed / user admin.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-press rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-spark"
        >
          {saving ? 'Enrolling…' : 'Enrol selected'}
        </button>
      </form>
    </section>
  )
}
