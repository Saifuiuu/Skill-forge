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
  // Do NOT set Content-Type manually — axios/browser must add the multipart boundary
  // or Multer never sees the file and generation returns 400.
  const { data } = await api.post(`/quiz-generator/${courseId}/generate`, form)
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
  const { data } = await api.post(
    `/quiz-generator/${courseId}/publish`,
    { questions },
    { headers: { 'Content-Type': 'application/json' } },
  )
  return data
}
