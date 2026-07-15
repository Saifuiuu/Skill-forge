import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types/auth'

const ROLE_BLURBS: Record<UserRole, string> = {
  EMPLOYEE: 'Continue mandatory training, track progress, and earn certificates.',
  MANAGER: 'Enrol your team, watch compliance risk, and close skill gaps.',
  CONTENT_ADMIN: 'Publish courses and review AI-generated quiz drafts.',
  HR_ADMIN: 'Monitor company-wide compliance and send risk reminders.',
}

const ROLE_ACTIONS: Record<UserRole, Array<{ to: string; label: string; primary?: boolean }>> = {
  EMPLOYEE: [
    { to: '/app/courses', label: 'Browse catalogue', primary: true },
    { to: '/app/my-courses', label: 'My courses' },
    { to: '/app/learning-path', label: 'Learning path' },
  ],
  MANAGER: [
    { to: '/app/bulk-enrol', label: 'Bulk enrol', primary: true },
    { to: '/app/compliance/team', label: 'Team compliance' },
    { to: '/app/skill-gap', label: 'Skill gap' },
  ],
  CONTENT_ADMIN: [
    { to: '/app/courses/manage', label: 'Manage courses', primary: true },
    { to: '/app/quiz-generator', label: 'Quiz generator' },
    { to: '/app/courses', label: 'Catalogue' },
  ],
  HR_ADMIN: [
    { to: '/app/compliance/company', label: 'Company compliance', primary: true },
    { to: '/app/compliance-alerter', label: 'Risk alerts' },
    { to: '/app/skill-gap', label: 'Skill gap' },
  ],
}

export function HomePage() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? 'EMPLOYEE'
  const actions = ROLE_ACTIONS[role]

  return (
    <section className="fade-rise max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-arc-deep">
        Welcome back
      </p>
      <h1 className="mt-2 font-display text-4xl text-ink">{user?.fullName}</h1>
      <p className="mt-3 text-lg text-ink-soft">{ROLE_BLURBS[role]}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={
              action.primary
                ? 'btn-press rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-spark'
                : 'btn-press rounded-md border border-line bg-panel px-4 py-2.5 text-sm font-medium text-ink'
            }
          >
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
