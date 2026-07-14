import { useEffect, useState } from 'react'
import {
  getAlertBatch,
  listAlertBatches,
  runComplianceAlerter,
  sendAlertBatch,
  type AlertBatch,
} from '../../api/complianceAlerter'

export function ComplianceAlerterPage() {
  const [batches, setBatches] = useState<AlertBatch[]>([])
  const [active, setActive] = useState<AlertBatch | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try {
      setBatches(await listAlertBatches())
    } catch {
      setError('Could not list batches.')
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const onRun = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const batch = await runComplianceAlerter()
      setActive(batch)
      setMessage(
        `Generated batch with ${batch.drafts.length} draft(s) · source ${batch.source}`,
      )
      await refresh()
    } catch {
      setError('Run failed.')
    } finally {
      setBusy(false)
    }
  }

  const openBatch = async (id: string) => {
    try {
      setActive(await getAlertBatch(id))
    } catch {
      setError('Could not load batch.')
    }
  }

  const onSend = async () => {
    if (!active) return
    setBusy(true)
    setError('')
    try {
      const sent = await sendAlertBatch(active.id)
      setActive(sent)
      setMessage('Reminders mock-sent (logged on server).')
      await refresh()
    } catch {
      setError('Send failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="fade-rise max-w-3xl">
      <h1 className="font-display text-3xl text-ink">Compliance risk alerter</h1>
      <p className="mt-1 text-ink-soft">
        Scan incomplete mandatory courses due within 14 days, review drafts, then mock-send.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onRun()}
          className="btn-press rounded-md bg-ink px-4 py-2.5 text-sm text-spark"
        >
          {busy ? 'Working…' : 'Run scan now'}
        </button>
        {active && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onSend()}
            className="rounded-md bg-arc px-4 py-2.5 text-sm font-medium text-ink"
          >
            Send all drafts (mock)
          </button>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-ok">{message}</p>}
      {error && <p className="mt-3 text-sm text-alert">{error}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <div>
          <p className="text-sm font-medium">Batches</p>
          <ul className="mt-2 space-y-2">
            {batches.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => void openBatch(b.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-xs ${
                    active?.id === b.id ? 'border-arc bg-arc/10' : 'border-line bg-panel'
                  }`}
                >
                  {new Date(b.generatedAt).toLocaleString()}
                  <br />
                  {b.drafts.length} drafts · {b.source}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {!active && <p className="text-ink-soft">Run a scan or select a batch to review.</p>}
          {active && (
            <>
              <p className="text-xs uppercase tracking-wide text-arc-deep">
                {active.trigger} · {active.source}
                {active.fallbackReason ? ` · ${active.fallbackReason}` : ''}
              </p>
              <ul className="mt-4 space-y-6">
                {active.drafts.map((d) => (
                  <li key={d.draftId} className="border-b border-line pb-4">
                    <p className="font-medium text-ink">
                      {d.employeeName}{' '}
                      <span className="text-xs text-ink-soft">({d.status})</span>
                    </p>
                    <p className="text-xs text-ink-soft">{d.employeeEmail}</p>
                    <p className="mt-2 text-sm font-medium">{d.subject}</p>
                    <pre className="mt-2 whitespace-pre-wrap rounded-md bg-panel p-3 text-xs text-ink-soft">
                      {d.body}
                    </pre>
                  </li>
                ))}
              </ul>
              {!active.drafts.length && (
                <p className="mt-4 text-ink-soft">
                  No at-risk employees in the 14-day window.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
