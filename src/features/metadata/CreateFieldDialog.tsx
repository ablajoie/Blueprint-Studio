import { useState, type SyntheticEvent } from 'react'
import { DialogActions, Field, Select, TextArea, TextInput } from '../../components/ui/FormControls'
import { Modal } from '../../components/ui/Modal'
import type { FieldDataType, SalesforceField, SalesforceObject } from '../../domain/blueprint'
import { generateFieldApiName } from '../../domain/blueprintFactory'
import { useWorkspaceStore } from '../../store/workspaceStore'

const fieldTypeGroups: { label: string; options: { value: FieldDataType; label: string }[] }[] = [
  {
    label: 'Text',
    options: [
      { value: 'text', label: 'Text' },
      { value: 'text-area', label: 'Text Area' },
      { value: 'long-text-area', label: 'Long Text Area' },
      { value: 'rich-text', label: 'Rich Text Area' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'url', label: 'URL' },
    ],
  },
  {
    label: 'Numbers',
    options: [
      { value: 'number', label: 'Number' },
      { value: 'currency', label: 'Currency' },
      { value: 'percent', label: 'Percent' },
      { value: 'geolocation', label: 'Geolocation' },
    ],
  },
  {
    label: 'Choice and status',
    options: [
      { value: 'checkbox', label: 'Checkbox' },
      { value: 'picklist', label: 'Picklist' },
      { value: 'multi-select-picklist', label: 'Multi-Select Picklist' },
    ],
  },
  {
    label: 'Date and time',
    options: [
      { value: 'date', label: 'Date' },
      { value: 'datetime', label: 'Date/Time' },
      { value: 'time', label: 'Time' },
    ],
  },
  {
    label: 'Relationships',
    options: [
      { value: 'lookup', label: 'Lookup Relationship' },
      { value: 'master-detail', label: 'Master-Detail Relationship' },
    ],
  },
  {
    label: 'Calculated',
    options: [
      { value: 'formula', label: 'Formula' },
      { value: 'auto-number', label: 'Auto Number' },
    ],
  },
]

const lengthTypes: FieldDataType[] = [
  'text',
  'text-area',
  'long-text-area',
  'rich-text',
  'email',
  'phone',
  'url',
]
const numericTypes: FieldDataType[] = ['number', 'currency', 'percent', 'geolocation']
const picklistTypes: FieldDataType[] = ['picklist', 'multi-select-picklist']
const relationshipTypes: FieldDataType[] = ['lookup', 'master-detail']

export function FieldDialog({
  object,
  availableObjects,
  field,
  onClose,
}: {
  object: SalesforceObject
  availableObjects: SalesforceObject[]
  field?: SalesforceField
  onClose: () => void
}) {
  const createField = useWorkspaceStore((state) => state.createField)
  const updateField = useWorkspaceStore((state) => state.updateField)
  const status = useWorkspaceStore((state) => state.status)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const [label, setLabel] = useState(field?.label ?? '')
  const [apiName, setApiName] = useState(field?.apiName ?? '')
  const [dataType, setDataType] = useState<FieldDataType>(field?.dataType ?? 'text')
  const [description, setDescription] = useState(field?.description ?? '')
  const [helpText, setHelpText] = useState(field?.helpText ?? '')
  const [required, setRequired] = useState(field?.required ?? false)
  const [defaultValue, setDefaultValue] = useState(
    field?.defaultValue === undefined || field.defaultValue === null
      ? ''
      : String(field.defaultValue),
  )
  const [length, setLength] = useState(String(field?.length ?? 255))
  const [precision, setPrecision] = useState(String(field?.precision ?? 18))
  const [scale, setScale] = useState(String(field?.scale ?? 2))
  const [picklistValues, setPicklistValues] = useState(
    field?.localPicklistValues?.map((value) => value.label).join('\n') ?? '',
  )
  const [referenceToObjectId, setReferenceToObjectId] = useState(field?.referenceToObjectId ?? '')
  const [formula, setFormula] = useState(field?.formula ?? '')
  const saving = status === 'saving'
  const suggestedApiName = label.trim() ? generateFieldApiName(label) : ''
  const relationshipObjects =
    dataType === 'master-detail'
      ? availableObjects.filter((candidate) => candidate.id !== object.id)
      : availableObjects

  const submit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault()
    if (!label.trim()) return
    clearError()
    const fieldInput = {
      label,
      apiName: apiName || suggestedApiName,
      dataType,
      description,
      helpText,
      required,
      defaultValue,
      ...(lengthTypes.includes(dataType) ? { length: Number(length) } : {}),
      ...(numericTypes.includes(dataType)
        ? { precision: Number(precision), scale: Number(scale) }
        : {}),
      formula,
      referenceToObjectId,
      picklistValues: picklistValues.split(/\r?\n/),
    }
    if (field) await updateField(field.id, fieldInput)
    else await createField(fieldInput)
    if (useWorkspaceStore.getState().status === 'ready') onClose()
  }

  const changeDataType = (nextType: FieldDataType) => {
    clearError()
    setDataType(nextType)
    if (nextType === 'master-detail') setRequired(true)
  }

  return (
    <Modal
      title={field ? `Edit ${field.label}` : `New field on ${object.label}`}
      description={
        field
          ? 'Update the Salesforce definition while preserving its connected design history.'
          : 'Capture the Salesforce definition and the documentation that should travel with it.'
      }
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
            <Field label="Field label">
              <TextInput
                autoFocus
                required
                maxLength={80}
                value={label}
                onChange={(event) => {
                  setLabel(event.target.value)
                }}
                placeholder="Risk Rating"
              />
            </Field>
            <Field label="Data type">
              <Select
                value={dataType}
                onChange={(event) => {
                  changeDataType(event.target.value as FieldDataType)
                }}
              >
                {fieldTypeGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="API name" hint="Generated automatically; override if needed">
            <TextInput
              maxLength={80}
              value={apiName}
              onChange={(event) => {
                setApiName(event.target.value)
              }}
              placeholder={suggestedApiName || 'Risk_Rating__c'}
            />
          </Field>

          {lengthTypes.includes(dataType) ? (
            <Field label="Length">
              <TextInput
                type="number"
                min={1}
                max={131072}
                required
                value={length}
                onChange={(event) => {
                  setLength(event.target.value)
                }}
              />
            </Field>
          ) : null}

          {numericTypes.includes(dataType) ? (
            <div className="grid grid-cols-2 gap-5">
              <Field label="Precision">
                <TextInput
                  type="number"
                  min={1}
                  max={18}
                  required
                  value={precision}
                  onChange={(event) => {
                    setPrecision(event.target.value)
                  }}
                />
              </Field>
              <Field label="Decimal places">
                <TextInput
                  type="number"
                  min={0}
                  max={18}
                  required
                  value={scale}
                  onChange={(event) => {
                    setScale(event.target.value)
                  }}
                />
              </Field>
            </div>
          ) : null}

          {picklistTypes.includes(dataType) ? (
            <Field label="Picklist values" hint="One value per line">
              <TextArea
                rows={5}
                required
                value={picklistValues}
                onChange={(event) => {
                  setPicklistValues(event.target.value)
                }}
                placeholder={'Draft\nSubmitted\nApproved'}
              />
            </Field>
          ) : null}

          {relationshipTypes.includes(dataType) ? (
            <Field label="Related object">
              <Select
                required
                value={referenceToObjectId}
                onChange={(event) => {
                  setReferenceToObjectId(event.target.value)
                }}
              >
                <option value="">Select an object</option>
                {relationshipObjects.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {dataType === 'formula' ? (
            <Field label="Formula expression">
              <TextArea
                rows={4}
                required
                value={formula}
                onChange={(event) => {
                  setFormula(event.target.value)
                }}
                placeholder="Amount__c * Ownership_Percentage__c"
                className="font-mono"
              />
            </Field>
          ) : null}

          <div className="grid grid-cols-2 gap-5">
            <Field label="Description" hint="Recommended">
              <TextArea
                rows={3}
                maxLength={500}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value)
                }}
                placeholder="What does this field represent?"
              />
            </Field>
            <Field label="Help text" hint="Optional">
              <TextArea
                rows={3}
                maxLength={255}
                value={helpText}
                onChange={(event) => {
                  setHelpText(event.target.value)
                }}
                placeholder="What should the user enter?"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={dataType === 'master-detail' || required}
                disabled={dataType === 'master-detail'}
                onChange={(event) => {
                  setRequired(event.target.checked)
                }}
                className="size-4 accent-blue-700"
              />
              Required
            </label>
            {dataType === 'checkbox' ? (
              <Field label="Default value">
                <Select
                  value={defaultValue}
                  onChange={(event) => {
                    setDefaultValue(event.target.value)
                  }}
                >
                  <option value="">No default</option>
                  <option value="false">Unchecked</option>
                  <option value="true">Checked</option>
                </Select>
              </Field>
            ) : !['formula', 'auto-number', 'lookup', 'master-detail'].includes(dataType) ? (
              <Field label="Default value" hint="Optional">
                <TextInput
                  value={defaultValue}
                  onChange={(event) => {
                    setDefaultValue(event.target.value)
                  }}
                />
              </Field>
            ) : null}
          </div>
        </div>
        <DialogActions>
          <button type="button" className="button-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={saving || !label.trim()}>
            {saving ? 'Saving…' : field ? 'Save changes' : 'Create field'}
          </button>
        </DialogActions>
      </form>
    </Modal>
  )
}

export function CreateFieldDialog(props: {
  object: SalesforceObject
  availableObjects: SalesforceObject[]
  onClose: () => void
}) {
  return <FieldDialog {...props} />
}
