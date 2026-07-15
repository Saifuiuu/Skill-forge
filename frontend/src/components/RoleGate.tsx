import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types/auth'

export function RoleGate({
  roles,
  children,
}: {
  roles: UserRole[]
  children: ReactNode
}) {
  const user = useAuthStore((s) => s.user)
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/app" replace />
  }
  return <>{children}</>
}
