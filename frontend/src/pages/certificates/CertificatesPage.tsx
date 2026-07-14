import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  downloadCertificate,
  getMyCertificates,
  verifyCertificate,
  type Certificate,
  type VerifyResult,
} from '../../api/certificates'

export function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [error, setError] = useState('')
  const [code, setCode] = useState('')

  useEffect(() => {
    void getMyCertificates()
      .then(setCerts)
      .catch(() => setError('Could not load certificates.'))
  }, [])

  const onDownload = async (id: string, title: string) => {
    try {
      const blob = await downloadCertificate(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/\s+/g, '_')}_certificate.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Download failed.')
    }
  }

  return (
    <section className="fade-rise">
      <h1 className="font-display text-3xl text-ink">Certificates</h1>
      <p className="mt-1 text-ink-soft">
        Earned completions and public verification codes.
      </p>
      {error && <p className="mt-3 text-sm text-alert">{error}</p>}

      <ul className="mt-8 space-y-4">
        {certs.map((cert) => (
          <li
            key={cert.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4"
          >
            <div>
              <p className="font-display text-lg text-ink">{cert.course.title}</p>
              <p className="text-xs text-ink-soft">
                Issued {String(cert.issueDate).slice(0, 10)} · Code{' '}
                <span className="font-mono">{cert.verificationCode}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void onDownload(cert.id, cert.course.title)}
                className="rounded-md bg-ink px-3 py-1.5 text-sm text-spark"
              >
                Download PDF
              </button>
              <Link
                to={`/verify/${cert.verificationCode}`}
                className="rounded-md border border-line px-3 py-1.5 text-sm"
              >
                Public verify
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {!certs.length && (
        <p className="mt-6 text-ink-soft">No certificates yet — pass a course quiz to earn one.</p>
      )}

      <form
        className="mt-10 max-w-md border-t border-line pt-6"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (code.trim()) window.location.href = `/verify/${code.trim()}`
        }}
      >
        <label className="block text-sm font-medium">
          Look up a verification code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2"
            placeholder="e.g. A1B2C3D4E5F6"
          />
        </label>
        <button type="submit" className="mt-3 rounded-md border border-line px-3 py-1.5 text-sm">
          Open verify page
        </button>
      </form>
    </section>
  )
}

export function VerifyCertificatePage() {
  const code = window.location.pathname.split('/').pop() ?? ''
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void verifyCertificate(code)
      .then(setResult)
      .catch(() => setError('Certificate not found or invalid.'))
      .finally(() => setLoading(false))
  }, [code])

  return (
    <div className="relative min-h-svh">
      <div
        className="absolute inset-0 bg-ink"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 20%, rgba(46,196,182,0.25), transparent 40%), linear-gradient(160deg,#07161C,#12343C)',
        }}
      />
      <div className="relative mx-auto flex min-h-svh max-w-lg items-center px-6 py-12">
        <div className="fade-rise w-full rounded-2xl border border-line/40 bg-panel p-8">
          <p className="font-display text-3xl text-ink">SkillForge</p>
          <h1 className="mt-2 font-display text-2xl text-ink">Certificate verification</h1>
          {loading && <p className="mt-4 text-ink-soft">Checking…</p>}
          {error && <p className="mt-4 text-alert">{error}</p>}
          {result && (
            <div className="mt-6 space-y-2 text-sm">
              <p className="text-ok font-medium">Valid certificate</p>
              <p>
                <span className="text-ink-soft">Holder:</span> {result.employeeName}
              </p>
              <p>
                <span className="text-ink-soft">Course:</span> {result.courseTitle}
              </p>
              <p>
                <span className="text-ink-soft">Issued:</span>{' '}
                {String(result.issueDate).slice(0, 10)}
              </p>
              <p className="font-mono text-xs">{result.verificationCode}</p>
            </div>
          )}
          <Link to="/login" className="mt-8 inline-block text-sm text-arc-deep underline">
            Back to SkillForge
          </Link>
        </div>
      </div>
    </div>
  )
}
