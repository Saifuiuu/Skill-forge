import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const ROLE_BLURBS: Record<string, string> = {
  EMPLOYEE: 'Continue mandatory training, track progress, and earn certificates.',
  MANAGER: 'Enrol your team, watch compliance risk, and close skill gaps.',
  CONTENT_ADMIN: 'Publish courses and review AI-generated quiz drafts.',
  HR_ADMIN: 'Monitor company-wide compliance and send risk reminders.',
}

export function HomePage() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? 'EMPLOYEE'

  return (
    <section className="fade-rise max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-arc-deep">
        Welcome back
      </p>
      <h1 className="mt-2 font-display text-4xl text-ink">{user?.fullName}</h1>
      <p className="mt-3 text-lg text-ink-soft">{ROLE_BLURBS[role]}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/app/courses"
          className="btn-press rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-spark"
        >
          Browse catalogue
        </Link>
        <Link
          to="/app/my-courses"
          className="btn-press rounded-md border border-line bg-panel px-4 py-2.5 text-sm font-medium text-ink"
        >
          My courses
        </Link>
      </div>

      <p className="mt-10 text-sm text-ink-soft">
        Full workspace is connected — courses, quizzes, certificates, compliance, and AI tools.
      </p>
    </section>
  )
}
