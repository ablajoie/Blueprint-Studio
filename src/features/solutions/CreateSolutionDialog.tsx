import { useState, type SyntheticEvent } from 'react'
import { DialogActions, Field, TextArea, TextInput } from '../../components/ui/FormControls'
import { Modal } from '../../components/ui/Modal'
import { useWorkspaceStore } from '../../store/workspaceStore'

export function CreateSolutionDialog({ onClose }: { onClose: () => void }) {
  const createSolution = useWorkspaceStore((state) => state.createSolution)
  const status = useWorkspaceStore((state) => state.status)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const saving = status === 'saving'

  const submit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault()
    if (!name.trim()) return
    await createSolution({ name, description })
    if (useWorkspaceStore.getState().status === 'ready') onClose()
  }

  return (
    <Modal
      title="Create a solution"
      description="A solution groups the design work for one capability or outcome."
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="space-y-5 px-6 py-5">
          <Field label="Solution name">
            <TextInput
              autoFocus
              required
              maxLength={120}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
              }}
              placeholder="Borrowing Structure"
            />
          </Field>
          <Field label="Description" hint="Optional">
            <TextArea
              rows={4}
              maxLength={500}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value)
              }}
              placeholder="Describe the capability this solution will deliver."
            />
          </Field>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            The first design version will be created as <strong>0.1 · Discovery</strong>.
          </div>
        </div>
        <DialogActions>
          <button type="button" className="button-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : 'Create solution'}
          </button>
        </DialogActions>
      </form>
    </Modal>
  )
}
