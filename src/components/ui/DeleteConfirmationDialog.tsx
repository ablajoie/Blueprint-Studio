import { useState } from 'react'
import { DialogActions, Field, TextInput } from './FormControls'
import { Modal } from './Modal'

export function DeleteConfirmationDialog({
  title,
  description,
  itemName,
  blockers,
  consequences,
  requireName = false,
  confirmLabel,
  busy,
  errorMessage,
  onConfirm,
  onClose,
}: {
  title: string
  description: string
  itemName: string
  blockers: string[]
  consequences: string[]
  requireName?: boolean
  confirmLabel: string
  busy: boolean
  errorMessage: string | null
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const [confirmation, setConfirmation] = useState('')
  const blocked = blockers.length > 0
  const confirmed = !requireName || confirmation === itemName

  return (
    <Modal
      title={blocked ? `Cannot delete ${itemName}` : title}
      description={description}
      onClose={onClose}
    >
      <div className="space-y-5 px-6 py-5">
        {blockers.length ? (
          <ImpactList title="Resolve these dependencies first" items={blockers} tone="warning" />
        ) : null}
        {consequences.length ? (
          <ImpactList title="This will also remove" items={consequences} tone="danger" />
        ) : null}
        {!blocked && requireName ? (
          <Field label={`Type “${itemName}” to confirm`}>
            <TextInput
              autoFocus
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value)
              }}
            />
          </Field>
        ) : null}
        {errorMessage ? (
          <p className="text-sm font-medium text-red-700" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
      <DialogActions>
        <button type="button" className="button-secondary" onClick={onClose} disabled={busy}>
          {blocked ? 'Close' : 'Cancel'}
        </button>
        {!blocked ? (
          <button
            type="button"
            className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={busy || !confirmed}
            onClick={() => {
              void onConfirm()
            }}
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        ) : null}
      </DialogActions>
    </Modal>
  )
}

function ImpactList({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: 'warning' | 'danger'
}) {
  const colors =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-950'
      : 'border-red-200 bg-red-50 text-red-950'
  return (
    <div className={`rounded-lg border p-4 text-sm ${colors}`}>
      <p className="font-semibold">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  )
}
