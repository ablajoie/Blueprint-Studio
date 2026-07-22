import { useState, type SyntheticEvent } from 'react'
import { DialogActions, Field, Select, TextArea, TextInput } from '../../components/ui/FormControls'
import { Modal } from '../../components/ui/Modal'
import type { ObjectRelationship, SalesforceField, SalesforceObject } from '../../domain/blueprint'
import { relationshipFieldApiName, suggestedRelationshipName } from '../../domain/connectedMetadata'
import { useWorkspaceStore } from '../../store/workspaceStore'

export function RelationshipDialog({
  objects,
  fields,
  relationship,
  onClose,
}: {
  objects: SalesforceObject[]
  fields: SalesforceField[]
  relationship?: ObjectRelationship
  onClose: () => void
}) {
  const createRelationship = useWorkspaceStore((state) => state.createRelationship)
  const updateRelationship = useWorkspaceStore((state) => state.updateRelationship)
  const status = useWorkspaceStore((state) => state.status)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const relationshipField = fields.find((field) => field.id === relationship?.fieldId)
  const [childObjectId, setChildObjectId] = useState(
    relationship?.childObjectId ?? objects[0]?.id ?? '',
  )
  const [parentObjectId, setParentObjectId] = useState(relationship?.parentObjectId ?? '')
  const [type, setType] = useState<ObjectRelationship['type']>(relationship?.type ?? 'lookup')
  const [fieldLabel, setFieldLabel] = useState(relationshipField?.label ?? '')
  const [fieldApiName, setFieldApiName] = useState(relationshipField?.apiName ?? '')
  const [relationshipName, setRelationshipName] = useState(relationship?.relationshipName ?? '')
  const [description, setDescription] = useState(
    relationship?.description ?? relationshipField?.description ?? '',
  )
  const [required, setRequired] = useState(relationshipField?.required ?? false)
  const saving = status === 'saving'
  const suggestedApiName = fieldLabel.trim() ? relationshipFieldApiName(fieldLabel) : ''
  const suggestedName = fieldLabel.trim() ? suggestedRelationshipName(fieldLabel) : ''

  const submit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault()
    if (!childObjectId || !parentObjectId || !fieldLabel.trim()) return
    clearError()
    const input = {
      childObjectId,
      parentObjectId,
      type,
      fieldLabel,
      fieldApiName: fieldApiName || suggestedApiName,
      relationshipName: relationshipName || suggestedName,
      description,
      required: type === 'master-detail' || required,
    }
    if (relationship) await updateRelationship(relationship.id, input)
    else await createRelationship(input)
    if (useWorkspaceStore.getState().status === 'ready') onClose()
  }

  return (
    <Modal
      title={relationship ? 'Edit relationship field' : 'Create relationship field'}
      description="This creates or updates a Salesforce field on the child object. The Relationships page is the architectural view of that same field."
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)}>
        <div className="max-h-[68vh] space-y-5 overflow-y-auto px-6 py-5">
          {errorMessage ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {errorMessage}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-5">
            <Field
              label="Field lives on"
              hint={
                relationship ? 'Child/detail object · fixed after creation' : 'Child/detail object'
              }
            >
              <Select
                required
                disabled={Boolean(relationship)}
                value={childObjectId}
                onChange={(event) => {
                  setChildObjectId(event.target.value)
                }}
              >
                <option value="">Select an object</option>
                {objects.map((object) => (
                  <option key={object.id} value={object.id}>
                    {object.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="References object" hint="Parent/master object">
              <Select
                required
                value={parentObjectId}
                onChange={(event) => {
                  setParentObjectId(event.target.value)
                }}
              >
                <option value="">Select an object</option>
                {objects.map((object) => (
                  <option key={object.id} value={object.id}>
                    {object.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Relationship type">
            <Select
              value={type}
              onChange={(event) => {
                const nextType = event.target.value as ObjectRelationship['type']
                setType(nextType)
                if (nextType === 'master-detail') setRequired(true)
              }}
            >
              <option value="lookup">Lookup</option>
              <option value="master-detail">Master-Detail</option>
              <option value="external-lookup">External Lookup</option>
              <option value="indirect-lookup">Indirect Lookup</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Field label">
              <TextInput
                autoFocus
                required
                maxLength={80}
                value={fieldLabel}
                placeholder="Borrower"
                onChange={(event) => {
                  setFieldLabel(event.target.value)
                }}
              />
            </Field>
            <Field label="Field API name" hint="Generated automatically">
              <TextInput
                maxLength={80}
                value={fieldApiName}
                placeholder={suggestedApiName || 'Borrower__c'}
                onChange={(event) => {
                  setFieldApiName(event.target.value)
                }}
              />
            </Field>
          </div>
          <Field label="Child relationship name" hint="Used by Salesforce relationship queries">
            <TextInput
              maxLength={80}
              value={relationshipName}
              placeholder={suggestedName || 'Borrower'}
              onChange={(event) => {
                setRelationshipName(event.target.value)
              }}
            />
          </Field>
          <Field label="Description" hint="Recommended">
            <TextArea
              rows={3}
              maxLength={500}
              value={description}
              placeholder="Why are these objects connected?"
              onChange={(event) => {
                setDescription(event.target.value)
              }}
            />
          </Field>
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={type === 'master-detail' || required}
              disabled={type === 'master-detail'}
              onChange={(event) => {
                setRequired(event.target.checked)
              }}
              className="size-4 accent-blue-700"
            />
            Required relationship
          </label>
        </div>
        <DialogActions>
          <button type="button" className="button-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={saving || !childObjectId || !parentObjectId || !fieldLabel.trim()}
          >
            {saving ? 'Saving…' : relationship ? 'Save field changes' : 'Create relationship field'}
          </button>
        </DialogActions>
      </form>
    </Modal>
  )
}
