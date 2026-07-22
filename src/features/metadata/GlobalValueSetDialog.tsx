import { useState, type SyntheticEvent } from 'react'
import { DialogActions, Field, Select, TextArea, TextInput } from '../../components/ui/FormControls'
import { Modal } from '../../components/ui/Modal'
import type { GlobalValueSet } from '../../domain/blueprint'
import { generateGlobalValueSetApiName } from '../../domain/connectedMetadata'
import { useWorkspaceStore } from '../../store/workspaceStore'

export function GlobalValueSetDialog({
  valueSet,
  onClose,
}: {
  valueSet?: GlobalValueSet
  onClose: () => void
}) {
  const createGlobalValueSet = useWorkspaceStore((state) => state.createGlobalValueSet)
  const updateGlobalValueSet = useWorkspaceStore((state) => state.updateGlobalValueSet)
  const status = useWorkspaceStore((state) => state.status)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const [label, setLabel] = useState(valueSet?.label ?? '')
  const [apiName, setApiName] = useState(valueSet?.apiName ?? '')
  const [description, setDescription] = useState(valueSet?.description ?? '')
  const [sorted, setSorted] = useState(valueSet?.sorted ?? false)
  const [values, setValues] = useState(
    valueSet?.values.map((value) => value.label).join('\n') ?? '',
  )
  const [defaultValue, setDefaultValue] = useState(
    valueSet?.values.find((value) => value.default)?.label ?? '',
  )
  const saving = status === 'saving'
  const suggestedApiName = label.trim() ? generateGlobalValueSetApiName(label) : ''
  const parsedValues = [
    ...new Set(
      values
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ]

  const submit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault()
    if (!label.trim() || !parsedValues.length) return
    clearError()
    const input = {
      label,
      apiName: apiName || suggestedApiName,
      description,
      sorted,
      values: parsedValues,
      defaultValue,
    }
    if (valueSet) await updateGlobalValueSet(valueSet.id, input)
    else await createGlobalValueSet(input)
    if (useWorkspaceStore.getState().status === 'ready') onClose()
  }

  return (
    <Modal
      title={valueSet ? `Edit ${valueSet.label}` : 'New global value set'}
      description="Create one governed list of values that multiple picklist fields can reuse."
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
            <Field label="Label">
              <TextInput
                autoFocus
                required
                maxLength={80}
                value={label}
                placeholder="Loan Status"
                onChange={(event) => {
                  setLabel(event.target.value)
                }}
              />
            </Field>
            <Field label="API name" hint="Generated automatically">
              <TextInput
                maxLength={80}
                value={apiName}
                placeholder={suggestedApiName || 'Loan_Status'}
                onChange={(event) => {
                  setApiName(event.target.value)
                }}
              />
            </Field>
          </div>
          <Field label="Description" hint="Recommended">
            <TextArea
              rows={3}
              maxLength={500}
              value={description}
              placeholder="Where should this shared value set be used?"
              onChange={(event) => {
                setDescription(event.target.value)
              }}
            />
          </Field>
          <Field label="Values" hint="One value per line">
            <TextArea
              rows={7}
              required
              value={values}
              placeholder={'Draft\nSubmitted\nApproved\nClosed'}
              onChange={(event) => {
                setValues(event.target.value)
                if (
                  defaultValue &&
                  !event.target.value
                    .split(/\r?\n/)
                    .some((value) => value.trim().toLowerCase() === defaultValue.toLowerCase())
                ) {
                  setDefaultValue('')
                }
              }}
            />
          </Field>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Default value" hint="Optional">
              <Select
                value={defaultValue}
                onChange={(event) => {
                  setDefaultValue(event.target.value)
                }}
              >
                <option value="">No default</option>
                {parsedValues.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="mt-6 flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={sorted}
                onChange={(event) => {
                  setSorted(event.target.checked)
                }}
                className="size-4 accent-blue-700"
              />
              Display values alphabetically
            </label>
          </div>
        </div>
        <DialogActions>
          <button type="button" className="button-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={saving || !label.trim() || !parsedValues.length}
          >
            {saving ? 'Saving…' : valueSet ? 'Save changes' : 'Create value set'}
          </button>
        </DialogActions>
      </form>
    </Modal>
  )
}
