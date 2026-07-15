import { useState } from 'react'
import type { FormEvent } from 'react'
import { recommendLearningPath } from '../../api/learningPath'

export function LearningPathPage() {
  const [careerGoal, setCareerGoal] = useState('')
  const [role, setRole] = useState('')
  const [department, setDepartment] = useState('')
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof recommendLearningPath>
  > | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await recommendLearningPath({
        careerGoal,
        role: role || undefined,
        department: department || undefined,
      })
      setResult(data)
    } catch {
      setError('Could not generate learning path.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="fade-rise max-w-3xl">
      <h1 className="font-display text-3xl text-ink">Learning path</h1>
      <p className="mt-1 text-ink-soft">
        Describe your career goal — AI (or HR fallback) sequences real courses from the catalogue.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm font-medium">
          Career goal
          <textarea
            required
            rows={3}
            value={careerGoal}
            onChange={(e) => setCareerGoal(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Role (optional)
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Department (optional)
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2"
            />
          </label>
        </div>
        {error && <p className="text-sm text-alert">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-press rounded-md bg-arc px-4 py-2.5 text-sm font-medium text-ink"
        >
          {loading ? 'Recommending…' : 'Get recommendation'}
        </button>
      </form>

      {result && (
        <div className="mt-10">
          <p className="text-xs uppercase tracking-wide text-arc-deep">
            Source: {result.source}
            {result.fallbackReason ? ` · ${result.fallbackReason}` : ''}
          </p>
          <p className="mt-2 text-ink">{result.summary}</p>
          <p className="mt-1 text-sm text-ink-soft">{result.totalEstimatedTime}</p>
          <ol className="mt-6 space-y-4">
            {result.courses.map((c) => (
              <li key={c.courseId} className="border-b border-line pb-4">
                <p className="font-display text-lg text-ink">
                  {c.sequenceOrder}. {c.title}
                </p>
                <p className="text-sm text-ink-soft">{c.rationale}</p>
                <p className="mt-1 text-xs text-ink-soft">{c.estimatedDuration}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
