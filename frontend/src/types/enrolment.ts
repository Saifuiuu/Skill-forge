import type { Course } from './course'

export type EnrolmentStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PENDING_QUIZ'
  | 'PASSED'
  | 'FAILED'

export interface Enrolment {
  id: string
  status: EnrolmentStatus
  progressPercentage: number
  bonusAttempts: number
  completedAt: string | null
  course: Course
  createdAt?: string
  updatedAt?: string
}
