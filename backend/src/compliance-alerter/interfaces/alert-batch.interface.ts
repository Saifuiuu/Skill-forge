export type AlertDraftStatus = 'DRAFT' | 'SENT' | 'DISCARDED';

export interface CourseRiskItem {
  courseId: string;
  courseTitle: string;
  regulatoryDeadline: string | null;
  daysUntilDeadline: number | null;
  enrolmentStatus: string;
  progressPercentage: number;
}

export interface ComplianceAlertDraft {
  draftId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  subject: string;
  body: string;
  coursesAtRisk: CourseRiskItem[];
  status: AlertDraftStatus;
  usedAi: boolean;
}

export interface ComplianceAlertBatch {
  id: string;
  generatedAt: string;
  source: 'ai' | 'fallback' | 'mixed';
  trigger: 'cron' | 'manual';
  fallbackReason?: string;
  drafts: ComplianceAlertDraft[];
  sentAt?: string;
}
