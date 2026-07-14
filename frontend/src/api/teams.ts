import { api } from '../lib/api'

export interface TeamSummary {
  id: string
  name: string
  department?: { id: string; name: string }
}

export async function listTeams() {
  const { data } = await api.get<TeamSummary[]>('/teams')
  return data
}
