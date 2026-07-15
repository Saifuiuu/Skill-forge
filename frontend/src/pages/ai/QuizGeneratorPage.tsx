import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { listCourses } from '../../api/courses'
import {
  generateQuizFromPdf,
  getQuizTemplate,
  publishQuizQuestions,
  type DraftQuestion,
} from '../../api/quizGenerator'
import type { Course } from '../../types/course'

function axiosMessage(err: unknown): string | undefined {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message
  if (Array.isArray(msg)) return msg.join(', ')
  return msg
}

function normalizeMcq(question: DraftQuestion): DraftQuestion {
  if (question.type !== 'MCQ') return question
  const options = [...(question.options ?? ['', '', '', ''])]
  while (options.length < 4) options.push('')
  const trimmed = options.slice(0, 4).map((o) => o.trim())
  let correctAnswer = question.correctAnswer.trim()
  if (correctAnswer && !trimmed.includes(correctAnswer)) {
    const letter = correctAnswer.match(/^([A-Da-d])(?:[).:\-]|\s|$)/)
    if (letter) {
      const idx = letter[1].toUpperCase().charCodeAt(0) - 65
      if (trimmed[idx]) correctAnswer = trimmed[idx]
    }
  }
  if (correctAnswer && !trimmed.includes(correctAnswer)) {
    correctAnswer = ''
  }
  return { ...question, options: trimmed, correctAnswer }
}

export function QuizGeneratorPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [courseId, setCourseId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [questions, setQuestions] = useState<DraftQuestion[]>([])
  const [meta, setMeta] = useState<{ source: string; reason?: string } | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const publishErrorRef = useRef<HTMLParagraphElement | null>(null)

  useEffect(() => {
    void listCourses().then(setCourses).catch(() => setError('Could not load courses.'))
  }, [])

  const loadTemplate = async () => {
    if (!courseId) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const data = await getQuizTemplate(courseId)
      setQuestions(data.questions.map(normalizeMcq))
      setMeta({ source: data.source, reason: data.fallbackReason })
    } catch {
      setError('Template load failed.')
    } finally {
      setBusy(false)
    }
  }

  const onGenerate = async (e: FormEvent) => {
    e.preventDefault()
    if (!courseId || !file) {
      setError('Select a course and PDF.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const data = await generateQuizFromPdf(courseId, file)
      setQuestions(data.questions.map(normalizeMcq))
      setMeta({ source: data.source, reason: data.fallbackReason })
      setMessage(
        data.source === 'fallback'
          ? 'Fallback template returned (AI disabled or unavailable). Edit then publish.'
          : 'AI drafts ready for review.',
      )
    } catch (err: unknown) {
      const detail = axiosMessage(err)
      setError(
        detail
          ? `Generation failed: ${detail}`
          : 'Generation failed. Try the blank template instead.',
      )
    } finally {
      setBusy(false)
    }
  }

  const updateQuestion = (index: number, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? normalizeMcq({ ...q, ...patch }) : q)),
    )
  }

  const discard = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const onPublish = async () => {
    if (!courseId) {
      setError('Select a course before publishing.')
      publishErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const normalized = questions.map(normalizeMcq)
    setQuestions(normalized)

    const ready = normalized.filter((q) => q.text.trim() && q.correctAnswer.trim())
    if (!ready.length) {
      setError('Add at least one complete question (text + correct answer).')
      publishErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    for (let i = 0; i < ready.length; i++) {
      const q = ready[i]
      if (q.type !== 'MCQ') continue
      const options = q.options ?? []
      if (options.length !== 4 || options.some((o) => !o.trim())) {
        setError(`Question ${i + 1}: MCQ needs exactly 4 non-empty options.`)
        publishErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      if (!options.includes(q.correctAnswer)) {
        setError(
          `Question ${i + 1}: correct answer must match one option exactly. Use the answer dropdown.`,
        )
        publishErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
    }

    setBusy(true)
    setError('')
    setMessage('')
    try {
      await publishQuizQuestions(
        courseId,
        ready.map((q) => ({
          type: q.type,
          text: q.text.trim(),
          options: q.type === 'MCQ' ? q.options : undefined,
          correctAnswer: q.correctAnswer.trim(),
          explanation: q.explanation?.trim() || undefined,
        })),
      )
      setMessage(`Published ${ready.length} question(s) to the course quiz.`)
    } catch (err: unknown) {
      const detail = axiosMessage(err)
      setError(
        detail
          ? `Publish failed: ${detail}`
          : 'Publish failed. Check each MCQ has 4 options and the correct answer matches one option.',
      )
      publishErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="fade-rise max-w-3xl">
      <h1 className="font-display text-3xl text-ink">Quiz generator</h1>
      <p className="mt-1 text-ink-soft">
        Upload a course PDF for AI drafts, or start from a blank template. Review before publish.
      </p>

      <form onSubmit={onGenerate} className="mt-8 space-y-4">
        <label className="block text-sm font-medium">
          Course
          <select
            required
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2"
          >
            <option value="">Select…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Course PDF
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="btn-press rounded-md bg-ink px-4 py-2 text-sm text-spark"
          >
            {busy ? 'Working…' : 'Generate from PDF'}
          </button>
          <button
            type="button"
            disabled={busy || !courseId}
            onClick={() => void loadTemplate()}
            className="rounded-md border border-line px-4 py-2 text-sm"
          >
            Blank template
          </button>
        </div>
      </form>

      {message && <p className="mt-4 text-sm text-ok">{message}</p>}
      {error && (
        <p ref={publishErrorRef} className="mt-4 text-sm text-alert">
          {error}
        </p>
      )}
      {meta && (
        <p className="mt-2 text-xs uppercase tracking-wide text-arc-deep">
          Source: {meta.source}
          {meta.reason ? ` · ${meta.reason}` : ''}
        </p>
      )}

      <ul className="mt-8 space-y-6">
        {questions.map((q, index) => (
          <li key={q.draftId} className="border-b border-line pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <select
                value={q.type}
                onChange={(e) =>
                  updateQuestion(index, {
                    type: e.target.value as DraftQuestion['type'],
                    options:
                      e.target.value === 'MCQ' ? q.options ?? ['', '', '', ''] : undefined,
                  })
                }
                className="rounded-md border border-line bg-panel px-2 py-1 text-sm"
              >
                <option value="MCQ">MCQ</option>
                <option value="SHORT_ANSWER">Short answer</option>
              </select>
              <button
                type="button"
                onClick={() => discard(index)}
                className="text-xs text-alert underline"
              >
                Discard
              </button>
            </div>
            <textarea
              value={q.text}
              onChange={(e) => updateQuestion(index, { text: e.target.value })}
              placeholder="Question text"
              rows={2}
              className="mt-2 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm"
            />
            {q.type === 'MCQ' && (
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {(q.options ?? ['', '', '', '']).map((opt, oi) => (
                  <input
                    key={oi}
                    value={opt}
                    onChange={(e) => {
                      const options = [...(q.options ?? ['', '', '', ''])]
                      options[oi] = e.target.value
                      const nextCorrect =
                        q.correctAnswer === opt ? e.target.value : q.correctAnswer
                      updateQuestion(index, {
                        options,
                        correctAnswer: nextCorrect,
                      })
                    }}
                    placeholder={`Option ${oi + 1}`}
                    className="rounded-md border border-line bg-panel px-3 py-2 text-sm"
                  />
                ))}
              </div>
            )}
            {q.type === 'MCQ' ? (
              <label className="mt-2 block text-sm">
                Correct answer
                <select
                  value={
                    (q.options ?? []).includes(q.correctAnswer) ? q.correctAnswer : ''
                  }
                  onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })}
                  className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm"
                >
                  <option value="">Select the matching option…</option>
                  {(q.options ?? [])
                    .filter((o) => o.trim())
                    .map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <input
                value={q.correctAnswer}
                onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })}
                placeholder="Correct answer"
                className="mt-2 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm"
              />
            )}
            <input
              value={q.explanation ?? ''}
              onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
              placeholder="Explanation (optional)"
              className="mt-2 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm"
            />
          </li>
        ))}
      </ul>

      {questions.length > 0 && (
        <div className="mt-4 space-y-2">
          {error && (
            <p className="text-sm text-alert" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={busy || !courseId}
            onClick={() => void onPublish()}
            className="btn-press rounded-md bg-arc px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-60"
          >
            {busy ? 'Publishing…' : 'Publish reviewed questions'}
          </button>
        </div>
      )}
    </section>
  )
}
