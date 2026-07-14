import { api } from '../lib/api'

export interface QuizQuestion {
  id: string
  type: 'MCQ' | 'SHORT_ANSWER'
  text: string
  options?: string[] | null
}

export interface Quiz {
  id: string
  passThreshold: number
  maxAttempts: number
  timeLimitMinutes: number
  course: { id: string; title: string }
  questions?: QuizQuestion[]
}

export interface StartAttemptResponse {
  attemptId: string
  expiresAt: string
  timeLimitMinutes: number
  passThreshold: number
  questions: QuizQuestion[]
}

export interface SubmitResult {
  score: number
  passed: boolean
  correctCount: number
  totalQuestions: number
  late: boolean
}

export async function listQuizzes() {
  const { data } = await api.get<Quiz[]>('/quizzes')
  return data
}

export async function startAttempt(quizId: string) {
  const { data } = await api.post<StartAttemptResponse>(
    `/quizzes/${quizId}/attempts/start`,
  )
  return data
}

export async function submitAttempt(
  attemptId: string,
  answers: { questionId: string; answer: string }[],
) {
  const { data } = await api.post<SubmitResult>(
    `/quizzes/attempts/${attemptId}/submit`,
    { answers },
  )
  return data
}
