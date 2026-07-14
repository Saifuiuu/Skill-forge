import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listQuizzes, startAttempt, submitAttempt } from '../../api/quizzes'
import type { QuizQuestion, StartAttemptResponse, SubmitResult } from '../../api/quizzes'

function formatRemaining(ms: number) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function QuizPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const [quizId, setQuizId] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<StartAttemptResponse | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [now, setNow] = useState(Date.now())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const quizzes = await listQuizzes()
        const match = quizzes.find((q) => q.course?.id === courseId)
        if (!match) {
          setError('No quiz published for this course yet.')
          return
        }
        setQuizId(match.id)
      } catch {
        setError('Could not load quiz.')
      } finally {
        setLoading(false)
      }
    })()
  }, [courseId])

  useEffect(() => {
    if (!attempt || result) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [attempt, result])

  const remainingMs = useMemo(() => {
    if (!attempt) return 0
    return new Date(attempt.expiresAt).getTime() - now
  }, [attempt, now])

  useEffect(() => {
    if (attempt && !result && remainingMs <= 0) {
      void onSubmit(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs])

  const begin = async () => {
    if (!quizId) return
    setError('')
    setLoading(true)
    try {
      const started = await startAttempt(quizId)
      setAttempt(started)
      setAnswers({})
      setResult(null)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not start attempt.'
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg))
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (auto = false) => {
    if (!attempt || submitting || result) return
    setSubmitting(true)
    setError('')
    try {
      const payload = attempt.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? '',
      }))
      const res = await submitAttempt(attempt.attemptId, payload)
      setResult(res)
      if (auto && !res.late) {
        // timed out naturally
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Submit failed.'
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg))
    } finally {
      setSubmitting(false)
    }
  }

  const setAnswer = (question: QuizQuestion, value: string) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }))
  }

  if (loading && !attempt) {
    return <p className="text-ink-soft">Loading quiz…</p>
  }

  if (result) {
    return (
      <section className="fade-rise max-w-xl">
        <h1 className="font-display text-3xl text-ink">Quiz result</h1>
        <p className={`mt-4 text-lg ${result.passed ? 'text-ok' : 'text-alert'}`}>
          {result.passed ? 'Passed' : 'Not passed'} — score {result.score}%
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          {result.correctCount}/{result.totalQuestions} correct
          {result.late ? ' · submitted after time expired' : ''}
        </p>
        <div className="mt-6 flex gap-3">
          <Link to="/app/my-courses" className="rounded-md bg-ink px-4 py-2 text-sm text-spark">
            Back to My Courses
          </Link>
          {result.passed && (
            <Link
              to="/app/certificates"
              className="rounded-md border border-line px-4 py-2 text-sm"
            >
              View certificates
            </Link>
          )}
        </div>
      </section>
    )
  }

  if (!attempt) {
    return (
      <section className="fade-rise max-w-xl">
        <h1 className="font-display text-3xl text-ink">Course quiz</h1>
        <p className="mt-2 text-ink-soft">
          Timed attempt with randomised questions. Pass threshold applies.
        </p>
        {error && <p className="mt-3 text-sm text-alert">{error}</p>}
        <button
          type="button"
          disabled={!quizId}
          onClick={() => void begin()}
          className="btn-press mt-6 rounded-md bg-spark px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-40"
        >
          Start attempt
        </button>
      </section>
    )
  }

  return (
    <section className="fade-rise max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-ink">Quiz in progress</h1>
        <p
          className={`font-display text-2xl tabular-nums ${
            remainingMs < 60_000 ? 'text-alert' : 'text-arc-deep'
          }`}
        >
          {formatRemaining(remainingMs)}
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-soft">Pass threshold: {attempt.passThreshold}%</p>
      {error && <p className="mt-3 text-sm text-alert">{error}</p>}

      <ol className="mt-8 space-y-8">
        {attempt.questions.map((q, index) => (
          <li key={q.id} className="border-b border-line pb-6">
            <p className="font-medium text-ink">
              {index + 1}. {q.text}
            </p>
            {q.type === 'MCQ' && q.options ? (
              <div className="mt-3 space-y-2">
                {q.options.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === option}
                      onChange={() => setAnswer(q, option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            ) : (
              <input
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswer(q, e.target.value)}
                className="mt-3 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm"
                placeholder="Short answer"
              />
            )}
          </li>
        ))}
      </ol>

      <button
        type="button"
        disabled={submitting}
        onClick={() => void onSubmit(false)}
        className="btn-press mt-6 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-spark"
      >
        {submitting ? 'Submitting…' : 'Submit answers'}
      </button>
    </section>
  )
}
