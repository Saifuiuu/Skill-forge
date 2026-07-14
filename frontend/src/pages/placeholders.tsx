import { Navigate } from 'react-router-dom'

/** Placeholder until Chunk 2+ screens are built. */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <section className="fade-rise max-w-2xl">
      <h1 className="font-display text-3xl text-ink">{title}</h1>
      <p className="mt-2 text-ink-soft">
        This screen is wired into navigation and will be built in the next frontend chunk.
      </p>
    </section>
  )
}

export function RootRedirect() {
  return <Navigate to="/login" replace />
}
