import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export function RegisterPage() {
  const register = useAuthStore((s) => s.register)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
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
      await register(fullName, email, password)
      navigate('/app', { replace: true })
    } catch {
      setError('Could not create account. Email may already be in use.')
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
            'radial-gradient(circle at 70% 15%, rgba(46,196,182,0.26), transparent 38%), linear-gradient(160deg, #07161C 0%, #12343C 100%)',
        }}
      />
      <div className="relative mx-auto flex min-h-svh max-w-lg items-center px-6 py-12">
        <form
          onSubmit={onSubmit}
          className="fade-rise w-full rounded-2xl border border-line/40 bg-panel p-8"
        >
          <p className="font-display text-3xl text-ink">SkillForge</p>
          <h1 className="mt-3 font-display text-2xl text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Registers as an employee. Managers and admins are provisioned by HR.
          </p>

          <label className="mt-6 block text-sm font-medium text-ink">
            Full name
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-line bg-canvas px-3 py-2.5 outline-none ring-arc focus:ring-2"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-ink">
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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-line bg-canvas px-3 py-2.5 outline-none ring-arc focus:ring-2"
            />
          </label>

          {error && <p className="mt-3 text-sm text-alert">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-press mt-6 w-full rounded-md bg-arc px-4 py-3 font-medium text-ink transition hover:bg-arc-deep hover:text-panel disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>

          <p className="mt-4 text-sm text-ink-soft">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-arc-deep underline-offset-2 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
