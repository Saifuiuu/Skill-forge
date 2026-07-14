import type { EnrolmentStatus } from '../types/enrolment'

const STYLES: Record<EnrolmentStatus | 'NOT_ENROLLED', string> = {
  NOT_STARTED: 'bg-line/60 text-ink',
  IN_PROGRESS: 'bg-arc/20 text-arc-deep',
  PENDING_QUIZ: 'bg-warn/40 text-ink',
  PASSED: 'bg-ok/20 text-ok',
  FAILED: 'bg-alert/15 text-alert',
  NOT_ENROLLED: 'bg-panel text-ink-soft border border-line',
}

export function StatusBadge({ status }: { status: EnrolmentStatus | 'NOT_ENROLLED' }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${STYLES[status]}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
