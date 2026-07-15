import { api } from '../lib/api'
import type { AuthUser } from '../types/auth'

export async function listUsers() {
  const { data } = await api.get<AuthUser[]>('/users')
  return data
}
