export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'CONTENT_ADMIN' | 'HR_ADMIN'

export interface AuthUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  team?: {
    id: string
    name: string
    department?: { id: string; name: string }
  } | null
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
