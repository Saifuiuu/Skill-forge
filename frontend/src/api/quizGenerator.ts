import { api } from '../lib/api'
import type { QuestionType } from '../types/quiz'

export interface DraftQuestion {
  draftId: string
  type: QuestionType
  text: string
  options?: string[]
  correctAnswer: string
  explanation?: string
}

export async function getQuizTemplate(courseId: string) {
  const { data } = await api.get(`/quiz-generator/${courseId}/template`)
  return data as {
    source: 'ai' | 'fallback'
    courseId: string
    courseTitle: string
    questions: DraftQuestion[]
    fallbackReason?: string
  }
}

export async function generateQuizFromPdf(courseId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post(`/quiz-generator/${courseId}/generate`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data as {
    source: 'ai' | 'fallback'
    courseId: string
    courseTitle: string
    extractedTextPreview: string
    questions: DraftQuestion[]
    fallbackReason?: string
  }
}

export async function publishQuizQuestions(
  courseId: string,
  questions: Array<{
    type: string
    text: string
    options?: string[]
    correctAnswer: string
    explanation?: string
  }>,
) {
  const { data } = await api.post(`/quiz-generator/${courseId}/publish`, {
    questions,
  })
  return data
}
