import { api } from '../lib/api'

export interface Certificate {
  id: string
  enrolmentId: string
  issueDate: string
  verificationCode: string
  pdfPath: string
  course: { id: string; title: string }
}

export interface VerifyResult {
  valid: boolean
  employeeName: string
  courseTitle: string
  issueDate: string
  verificationCode: string
}

export async function getMyCertificates() {
  const { data } = await api.get<Certificate[]>('/certificates/mine')
  return data
}

export async function downloadCertificate(id: string) {
  const { data } = await api.get<Blob>(`/certificates/${id}/download`, {
    responseType: 'blob',
  })
  return data
}

export async function verifyCertificate(code: string) {
  const { data } = await api.get<VerifyResult>(`/certificates/verify/${code}`)
  return data
}
