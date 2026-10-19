import { useEffect } from 'react'

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [message, onDone])
  if (!message) return null
  return (
    <div
      role="status"
      className="animate-rise pointer-events-none absolute inset-x-0 top-20 z-[1200] flex justify-center px-4"
    >
      <p className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-surface shadow-lg">{message}</p>
    </div>
  )
}
