import { api } from '../lib/api'

export async function analyzeSkillGap(payload: {
  teamId: string
  requiredCourseIds: string[]
  frameworkName?: string
}) {
  const { data } = await api.post('/skill-gap/analyze', payload)
  return data as {
    source: 'ai' | 'fallback'
    teamId: string
    teamName: string
    frameworkName?: string
    teamSize: number
    teamSummary: Array<{
      courseId: string
      courseTitle: string
      teamCoverage: 'COVERED' | 'PARTIALLY_COVERED' | 'MISSING'
      coveredCount: number
      partiallyCoveredCount: number
      missingCount: number
      teamSize: number
      regulatoryDeadline?: string | null
      urgencyRank: number
      aiRationale?: string
    }>
    individualBreakdown: Array<{
      employeeId: string
      employeeName: string
      coveredCount: number
      partiallyCoveredCount: number
      missingCount: number
      skills: Array<{
        courseId: string
        courseTitle: string
        coverage: string
        enrolmentStatus: string
        progressPercentage: number
      }>
    }>
    priorityOrder: string[]
    summary?: string
    fallbackReason?: string
  }
}
