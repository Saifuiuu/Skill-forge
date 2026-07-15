import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createCourse,
  deleteCourse,
  listCourses,
  updateCourse,
} from '../../api/courses'
import type { Course, CreateCoursePayload } from '../../types/course'

const emptyForm: CreateCoursePayload = {
  title: '',
  description: '',
  estimatedDuration: '2 hours',
  isMandatory: false,
  regulatoryDeadline: '',
  contentType: 'PDF',
  contentUrl: '',
}

export function ManageCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [form, setForm] = useState<CreateCoursePayload>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      setCourses(await listCourses())
    } catch {
      setError('Could not load courses.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload: CreateCoursePayload = {
      ...form,
      regulatoryDeadline: form.regulatoryDeadline || undefined,
      contentUrl: form.contentUrl || undefined,
    }
    try {
      if (editingId) {
        await updateCourse(editingId, payload)
      } else {
        await createCourse(payload)
      }
      setForm(emptyForm)
      setEditingId(null)
      await load()
    } catch {
      setError('Save failed. Check required fields.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (course: Course) => {
    setEditingId(course.id)
    setForm({
      title: course.title,
      description: course.description,
      estimatedDuration: course.estimatedDuration,
      isMandatory: course.isMandatory,
      regulatoryDeadline: course.regulatoryDeadline
        ? String(course.regulatoryDeadline).slice(0, 10)
        : '',
      contentType: course.contentType ?? 'PDF',
      contentUrl: course.contentUrl ?? '',
    })
  }

  const onDelete = async (id: string) => {
    if (!confirm('Delete this course?')) return
    try {
      await deleteCourse(id)
      await load()
    } catch {
      setError('Delete failed.')
    }
  }

  return (
    <section className="fade-rise">
      <h1 className="font-display text-3xl text-ink">Manage courses</h1>
      <p className="mt-1 text-ink-soft">Create and update course content for learners.</p>
      {error && <p className="mt-3 text-sm text-alert">{error}</p>}

      <form
        onSubmit={onSubmit}
        className="mt-8 grid gap-4 border-t border-line pt-6 md:grid-cols-2"
      >
        <label className="block text-sm font-medium">
          Title
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          Duration
          <input
            required
            value={form.estimatedDuration}
            onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })}
            className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium md:col-span-2">
          Description
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          Deadline
          <input
            type="date"
            value={form.regulatoryDeadline ?? ''}
            onChange={(e) => setForm({ ...form, regulatoryDeadline: e.target.value })}
            className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          Content URL
          <input
            value={form.contentUrl ?? ''}
            onChange={(e) => setForm({ ...form, contentUrl: e.target.value })}
            className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
          <input
            type="checkbox"
            checked={Boolean(form.isMandatory)}
            onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })}
          />
          Mandatory course
        </label>
        <div className="flex gap-2 md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-press rounded-md bg-arc px-4 py-2 text-sm font-medium text-ink"
          >
            {saving ? 'Saving…' : editingId ? 'Update course' : 'Create course'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setForm(emptyForm)
              }}
              className="rounded-md border border-line px-4 py-2 text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <ul className="mt-10 space-y-4">
        {courses.map((course) => (
          <li
            key={course.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4"
          >
            <div>
              <p className="font-display text-lg text-ink">{course.title}</p>
              <p className="text-xs text-ink-soft">
                v{course.version}
                {course.isMandatory ? ' · Mandatory' : ''}
                {course.regulatoryDeadline
                  ? ` · Due ${String(course.regulatoryDeadline).slice(0, 10)}`
                  : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(course)}
                className="rounded-md border border-line px-3 py-1.5 text-sm"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void onDelete(course.id)}
                className="rounded-md border border-alert/40 px-3 py-1.5 text-sm text-alert"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
