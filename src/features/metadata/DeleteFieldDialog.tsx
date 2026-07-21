import { DialogActions } from '../../components/ui/FormControls'
import { Modal } from '../../components/ui/Modal'
import type { SalesforceField } from '../../domain/blueprint'
import { useWorkspaceStore } from '../../store/workspaceStore'

export function DeleteFieldDialog({
  field,
  dependencies,
  onConfirm,
  onClose,
}: {
  field: SalesforceField
  dependencies: string[]
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const status = useWorkspaceStore((state) => state.status)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const saving = status === 'saving'
  const blocked = dependencies.length > 0

  const confirm = async () => {
    await onConfirm()
    if (useWorkspaceStore.getState().status === 'ready') onClose()
  }

  return (
    <Modal
      title={blocked ? `Cannot delete ${field.label}` : `Delete ${field.label}?`}
      description={
        blocked
          ? 'This field is still connected to other design artifacts.'
          : 'This removes the field and its relationship definition from this design version.'
      }
      onClose={onClose}
    >
      <div className="space-y-4 px-6 py-5">
        {blocked ? (
          <>
            <p className="text-sm leading-6 text-slate-700">
              Remove these references before deleting the field:
            </p>
            <ul className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {dependencies.map((dependency) => (
                <li key={dependency}>• {dependency}</li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
            This action cannot be undone. Other fields and objects will remain unchanged.
          </div>
        )}
        {errorMessage ? (
          <p className="text-sm font-medium text-red-700" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
      <DialogActions>
        <button type="button" className="button-secondary" onClick={onClose} disabled={saving}>
          {blocked ? 'Close' : 'Cancel'}
        </button>
        {!blocked ? (
          <button
            type="button"
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void confirm()}
            disabled={saving}
          >
            {saving ? 'Deleting…' : 'Delete field'}
          </button>
        ) : null}
      </DialogActions>
    </Modal>
  )
}
