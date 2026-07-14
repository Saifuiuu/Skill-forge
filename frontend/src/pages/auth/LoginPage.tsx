import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/app'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-svh overflow-hidden">
      <div
        className="absolute inset-0 bg-ink"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(46,196,182,0.28), transparent 40%), radial-gradient(circle at 80% 70%, rgba(214,255,58,0.16), transparent 35%), linear-gradient(160deg, #07161C 0%, #0E2A33 100%)',
        }}
      />
      <div className="relative mx-auto grid min-h-svh max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-2">
        <div className="fade-rise text-panel">
          <p className="font-display text-5xl leading-none tracking-tight text-spark md:text-6xl">
            SkillForge
          </p>
          <h1 className="mt-6 max-w-md font-display text-3xl text-panel md:text-4xl">
            Corporate training that keeps certifications sharp.
          </h1>
          <p className="mt-4 max-w-md text-base text-panel/75">
            Sign in to continue learning, manage compliance, or publish course content.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="fade-rise w-full max-w-md justify-self-end rounded-2xl border border-line/40 bg-panel p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        >
          <h2 className="font-display text-2xl text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-ink-soft">Use your SkillForge account</p>

          <label className="mt-6 block text-sm font-medium text-ink">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-line bg-canvas px-3 py-2.5 outline-none ring-arc focus:ring-2"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-ink">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-line bg-canvas px-3 py-2.5 outline-none ring-arc focus:ring-2"
            />
          </label>

          {error && <p className="mt-3 text-sm text-alert">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-press mt-6 w-full rounded-md bg-ink px-4 py-3 font-medium text-spark transition hover:bg-ink/90 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="mt-4 text-sm text-ink-soft">
            New here?{' '}
            <Link to="/register" className="font-medium text-arc-deep underline-offset-2 hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
