import { useState, type SyntheticEvent } from 'react'
import { DialogActions, Field, Select, TextArea, TextInput } from '../../components/ui/FormControls'
import { Modal } from '../../components/ui/Modal'
import type { ObjectKind, SalesforceObject } from '../../domain/blueprint'
import { generateApiName } from '../../domain/blueprintFactory'
import { useWorkspaceStore } from '../../store/workspaceStore'

const objectKinds: { value: ObjectKind; label: string }[] = [
  { value: 'custom', label: 'Custom object' },
  { value: 'standard', label: 'Standard object' },
  { value: 'external', label: 'External object' },
  { value: 'custom-metadata-type', label: 'Custom metadata type' },
  { value: 'platform-event', label: 'Platform event' },
  { value: 'big-object', label: 'Big object' },
]

export function ObjectDialog({
  object,
  onClose,
}: {
  object?: SalesforceObject
  onClose: () => void
}) {
  const createObject = useWorkspaceStore((state) => state.createObject)
  const updateObject = useWorkspaceStore((state) => state.updateObject)
  const status = useWorkspaceStore((state) => state.status)
  const [label, setLabel] = useState(object?.label ?? '')
  const [pluralLabel, setPluralLabel] = useState(object?.pluralLabel ?? '')
  const [apiName, setApiName] = useState(object?.apiName ?? '')
  const [kind, setKind] = useState<ObjectKind>(object?.kind ?? 'custom')
  const [description, setDescription] = useState(object?.description ?? '')
  const saving = status === 'saving'
  const suggestedApiName = label.trim() ? generateApiName(label, kind) : ''

  const submit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault()
    if (!label.trim()) return
    const input = {
      label,
      pluralLabel,
      apiName: apiName || suggestedApiName,
      kind,
      description,
    }
    if (object) await updateObject(object.id, input)
    else await createObject(input)
    if (useWorkspaceStore.getState().status === 'ready') onClose()
  }

  return (
    <Modal
      title={object ? `Edit ${object.label}` : 'Create a Salesforce object'}
      description={
        object
          ? 'Update the Salesforce definition without changing the object’s connected identity.'
          : 'Start with the Salesforce essentials. Governance details can be added as the design matures.'
      }
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="grid grid-cols-2 gap-5 px-6 py-5">
          <div className="col-span-2">
            <Field label="Object type">
              <Select
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value as ObjectKind)
                }}
              >
                {objectKinds.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Label">
            <TextInput
              autoFocus
              required
              maxLength={80}
              value={label}
              onChange={(event) => {
                setLabel(event.target.value)
              }}
              placeholder="Borrowing Structure"
            />
          </Field>
          <Field label="Plural label" hint="Optional">
            <TextInput
              maxLength={80}
              value={pluralLabel}
              onChange={(event) => {
                setPluralLabel(event.target.value)
              }}
              placeholder="Borrowing Structures"
            />
          </Field>
          <div className="col-span-2">
            <Field label="API name" hint="Generated automatically; override if needed">
              <TextInput
                maxLength={80}
                value={apiName}
                onChange={(event) => {
                  setApiName(event.target.value)
                }}
                placeholder={suggestedApiName || 'Borrowing_Structure__c'}
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Description" hint="Optional for now; Review will flag it later">
              <TextArea
                rows={3}
                maxLength={500}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value)
                }}
                placeholder="What business concept does this object represent?"
              />
            </Field>
          </div>
        </div>
        <DialogActions>
          <button type="button" className="button-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={saving || !label.trim()}>
            {saving ? 'Saving…' : object ? 'Save changes' : 'Create object'}
          </button>
        </DialogActions>
      </form>
    </Modal>
  )
}

export function CreateObjectDialog({ onClose }: { onClose: () => void }) {
  return <ObjectDialog onClose={onClose} />
}
