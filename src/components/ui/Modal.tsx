import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  title: string
  description: string
  children: ReactNode
  onClose: () => void
}

export function Modal({ title, description, children, onClose }: ModalProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-6"
      role="presentation"
    >
      <section
        className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 id="dialog-title" className="text-xl font-semibold text-slate-950">
              {title}
            </h2>
            <p id="dialog-description" className="mt-1 text-sm text-slate-600">
              {description}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
