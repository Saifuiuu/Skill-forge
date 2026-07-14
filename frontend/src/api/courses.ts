import { api } from '../lib/api'
import type { Course, CreateCoursePayload } from '../types/course'

export async function listCourses(params?: {
  departmentId?: string
  mandatory?: boolean
}) {
  const { data } = await api.get<Course[]>('/courses', { params })
  return data
}

export async function getCourse(id: string) {
  const { data } = await api.get<Course>(`/courses/${id}`)
  return data
}

export async function createCourse(payload: CreateCoursePayload) {
  const { data } = await api.post<Course>('/courses', payload)
  return data
}

export async function updateCourse(id: string, payload: Partial<CreateCoursePayload>) {
  const { data } = await api.patch<Course>(`/courses/${id}`, payload)
  return data
}

export async function deleteCourse(id: string) {
  await api.delete(`/courses/${id}`)
}

export async function createCourseVersion(
  id: string,
  payload: Partial<CreateCoursePayload>,
) {
  const { data } = await api.post<Course>(`/courses/${id}/new-version`, payload)
  return data
}
