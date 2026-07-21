import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

interface FieldProps {
  label: string
  hint?: string
  children: ReactNode
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {hint ? <span className="ml-2 text-xs text-slate-500">{hint}</span> : null}
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`form-control ${props.className ?? ''}`} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`form-control resize-y ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`form-control ${props.className ?? ''}`} />
}

export function DialogActions({ children }: { children: ReactNode }) {
  return (
    <footer className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
      {children}
    </footer>
  )
}
