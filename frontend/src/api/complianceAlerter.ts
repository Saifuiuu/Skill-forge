import { api } from '../lib/api'

export interface AlertDraft {
  draftId: string
  employeeId: string
  employeeName: string
  employeeEmail: string
  subject: string
  body: string
  coursesAtRisk: Array<{
    courseId: string
    courseTitle: string
    regulatoryDeadline: string | null
    daysUntilDeadline: number | null
  }>
  status: 'DRAFT' | 'SENT' | 'DISCARDED'
  usedAi: boolean
}

export interface AlertBatch {
  id: string
  generatedAt: string
  source: 'ai' | 'fallback' | 'mixed'
  trigger: 'cron' | 'manual'
  fallbackReason?: string
  drafts: AlertDraft[]
  sentAt?: string
}

export async function runComplianceAlerter() {
  const { data } = await api.post<AlertBatch>('/compliance-alerter/run')
  return data
}

export async function listAlertBatches() {
  const { data } = await api.get<AlertBatch[]>('/compliance-alerter/batches')
  return data
}

export async function getAlertBatch(id: string) {
  const { data } = await api.get<AlertBatch>(`/compliance-alerter/batches/${id}`)
  return data
}

export async function sendAlertBatch(id: string, draftIds?: string[]) {
  const { data } = await api.post<AlertBatch>(
    `/compliance-alerter/batches/${id}/send`,
    draftIds ? { draftIds } : {},
  )
  return data
}
