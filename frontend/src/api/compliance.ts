import { api } from '../lib/api'

export async function getTeamCompliance() {
  const { data } = await api.get('/compliance/team')
  return data as {
    teamName: string
    teamSize: number
    courseBreakdown: Array<{
      courseId: string
      courseTitle: string
      regulatoryDeadline: string | null
      completionRate: number
      employeeStatuses: Array<{
        employeeId: string
        employeeName: string
        status: string
        risk: 'green' | 'amber' | 'red'
      }>
    }>
  }
}

export async function getCompanyCompliance() {
  const { data } = await api.get('/compliance/company')
  return data as {
    heatmap: Array<{
      departmentId: string
      departmentName: string
      employeeCount: number
      courses: Array<{
        courseId: string
        courseTitle: string
        regulatoryDeadline: string | null
        completionRate: number
        risk: 'green' | 'amber' | 'red'
      }>
    }>
  }
}

export async function downloadComplianceCsv() {
  const { data } = await api.get<Blob>('/compliance/company/export', {
    responseType: 'blob',
  })
  return data
}
