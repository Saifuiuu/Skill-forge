export type ContentType = 'PDF' | 'VIDEO'

export interface Course {
  id: string
  title: string
  description: string
  estimatedDuration: string
  isMandatory: boolean
  regulatoryDeadline: string | null
  departmentIds: string[]
  contentType: ContentType | null
  contentUrl: string | null
  version: number
  isLatestVersion: boolean
  previousVersionId: string | null
  prerequisites?: { id: string; title: string }[]
  createdAt?: string
  updatedAt?: string
}

export interface CreateCoursePayload {
  title: string
  description: string
  estimatedDuration: string
  isMandatory?: boolean
  regulatoryDeadline?: string
  departmentIds?: string[]
  contentType?: ContentType
  contentUrl?: string
  prerequisiteCourseIds?: string[]
}
