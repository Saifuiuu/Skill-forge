import { api } from '../lib/api'

export async function recommendLearningPath(payload: {
  careerGoal: string
  role?: string
  department?: string
  completionHistory?: string
}) {
  const { data } = await api.post('/learning-path/recommend', payload)
  return data as {
    source: 'ai' | 'fallback'
    courses: Array<{
      courseId: string
      title: string
      sequenceOrder: number
      rationale: string
      estimatedDuration: string
    }>
    totalEstimatedTime: string
    summary: string
    fallbackReason?: string
  }
}
