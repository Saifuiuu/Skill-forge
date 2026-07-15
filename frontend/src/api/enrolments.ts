import { api } from '../lib/api'
import type { Enrolment } from '../types/enrolment'

export async function selfEnrol(courseId: string) {
  const { data } = await api.post<Enrolment>('/enrolments/self', { courseId })
  return data
}

export async function bulkEnrol(courseId: string, employeeIds: string[]) {
  const { data } = await api.post<Enrolment[]>('/enrolments/bulk', {
    courseId,
    employeeIds,
  })
  return data
}

export async function getMyEnrolments() {
  const { data } = await api.get<Enrolment[]>('/enrolments/mine')
  return data
}

export async function updateProgress(enrolmentId: string, progressPercentage: number) {
  const { data } = await api.patch<Enrolment>(`/enrolments/${enrolmentId}/progress`, {
    progressPercentage,
  })
  return data
}
