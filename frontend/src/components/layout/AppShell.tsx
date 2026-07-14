import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import type { UserRole } from '../../types/auth'
import { useManagerNotifications } from '../../hooks/useManagerNotifications'

interface NavItem {
  to: string
  label: string
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Home', roles: ['EMPLOYEE', 'MANAGER', 'CONTENT_ADMIN', 'HR_ADMIN'] },
  { to: '/app/courses', label: 'Catalogue', roles: ['EMPLOYEE', 'MANAGER', 'CONTENT_ADMIN', 'HR_ADMIN'] },
  { to: '/app/my-courses', label: 'My Courses', roles: ['EMPLOYEE', 'MANAGER', 'CONTENT_ADMIN', 'HR_ADMIN'] },
  { to: '/app/learning-path', label: 'Learning Path', roles: ['EMPLOYEE', 'MANAGER', 'CONTENT_ADMIN', 'HR_ADMIN'] },
  { to: '/app/certificates', label: 'Certificates', roles: ['EMPLOYEE', 'MANAGER', 'CONTENT_ADMIN', 'HR_ADMIN'] },
  { to: '/app/bulk-enrol', label: 'Bulk Enrol', roles: ['MANAGER'] },
  { to: '/app/compliance/team', label: 'Team Compliance', roles: ['MANAGER'] },
  { to: '/app/skill-gap', label: 'Skill Gap', roles: ['MANAGER', 'HR_ADMIN'] },
  { to: '/app/courses/manage', label: 'Manage Courses', roles: ['CONTENT_ADMIN'] },
  { to: '/app/quiz-generator', label: 'Quiz Generator', roles: ['CONTENT_ADMIN'] },
  { to: '/app/compliance/company', label: 'Company Compliance', roles: ['HR_ADMIN'] },
  { to: '/app/compliance-alerter', label: 'Risk Alerts', roles: ['HR_ADMIN'] },
]

export function AppShell() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const hydrateProfile = useAuthStore((s) => s.hydrateProfile)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { toast, clearToast } = useManagerNotifications()

  useEffect(() => {
    void hydrateProfile().catch(() => undefined)
  }, [hydrateProfile])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(clearToast, 8000)
    return () => window.clearTimeout(timer)
  }, [toast, clearToast])

  const items = useMemo(
    () => NAV_ITEMS.filter((item) => user && item.roles.includes(user.role)),
    [user],
  )

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[240px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-line bg-ink text-panel transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col px-5 py-6">
          <div className="mb-10">
            <p className="font-display text-2xl tracking-tight text-spark">SkillForge</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-arc">
              Training & certification
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/app'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-arc/20 text-spark'
                      : 'text-panel/80 hover:bg-white/5 hover:text-panel'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 border-t border-white/10 pt-4 text-sm">
            <p className="font-medium text-panel">{user?.fullName}</p>
            <p className="text-arc">{user?.role.replace('_', ' ')}</p>
            <button
              type="button"
              onClick={onLogout}
              className="btn-press mt-4 w-full rounded-md border border-arc/40 px-3 py-2 text-left text-panel hover:bg-arc/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-h-svh flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-panel/90 px-4 py-3 backdrop-blur lg:px-8">
          <button
            type="button"
            className="rounded-md border border-line px-3 py-1.5 text-sm lg:hidden"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
          <p className="hidden font-display text-lg text-ink lg:block">Workspace</p>
          <p className="text-sm text-ink-soft">{user?.email}</p>
        </header>

        <main className="relative flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {toast && (
            <div className="fade-rise mb-4 rounded-md border border-arc bg-panel px-4 py-3 text-sm text-ink shadow-sm">
              <p className="font-medium text-arc-deep">Team completion</p>
              <p>
                {toast.employeeName} completed <strong>{toast.courseTitle}</strong>
              </p>
              <button
                type="button"
                onClick={clearToast}
                className="mt-2 text-xs text-ink-soft underline"
              >
                Dismiss
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
