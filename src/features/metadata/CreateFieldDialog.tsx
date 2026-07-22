import { useState, type SyntheticEvent } from 'react'
import { DialogActions, Field, Select, TextArea, TextInput } from '../../components/ui/FormControls'
import { Modal } from '../../components/ui/Modal'
import type {
  FieldDataType,
  GlobalValueSet,
  PicklistDependencyMapping,
  SalesforceField,
  SalesforceObject,
} from '../../domain/blueprint'
import { generateFieldApiName } from '../../domain/blueprintFactory'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { PicklistConfiguration } from './PicklistConfiguration'
import { getControllingFields, getFieldValues, parseValueLines } from './picklistConfigurationModel'

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
      { value: 'external-lookup', label: 'External Lookup Relationship' },
      { value: 'indirect-lookup', label: 'Indirect Lookup Relationship' },
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
const relationshipTypes: FieldDataType[] = [
  'lookup',
  'master-detail',
  'external-lookup',
  'indirect-lookup',
]

export function FieldDialog({
  object,
  availableObjects,
  availableFields = [],
  globalValueSets = [],
  field,
  onClose,
}: {
  object: SalesforceObject
  availableObjects: SalesforceObject[]
  availableFields?: SalesforceField[]
  globalValueSets?: GlobalValueSet[]
  field?: SalesforceField
  onClose: () => void
}) {
  const createField = useWorkspaceStore((state) => state.createField)
  const updateField = useWorkspaceStore((state) => state.updateField)
  const status = useWorkspaceStore((state) => state.status)
  const errorMessage = useWorkspaceStore((state) => state.errorMessage)
  const clearError = useWorkspaceStore((state) => state.clearError)
  const blueprint = useWorkspaceStore((state) => state.blueprint)
  const selectedSolutionId = useWorkspaceStore((state) => state.selectedSolutionId)
  const relationship = blueprint?.solutions
    .find((solution) => solution.id === selectedSolutionId)
    ?.versions.at(-1)
    ?.metadata.relationships.find((item) => item.fieldId === field?.id)
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
  const [globalValueSetId, setGlobalValueSetId] = useState(field?.globalValueSetId ?? '')
  const [controllingFieldId, setControllingFieldId] = useState(
    field?.picklistDependency?.controllingFieldId ?? '',
  )
  const [dependencySelections, setDependencySelections] = useState<Record<string, string[]>>(
    Object.fromEntries(
      field?.picklistDependency?.mappings.map((mapping) => [
        mapping.controllingValue,
        mapping.dependentValues,
      ]) ?? [],
    ),
  )
  const [referenceToObjectId, setReferenceToObjectId] = useState(field?.referenceToObjectId ?? '')
  const [formula, setFormula] = useState(field?.formula ?? '')
  const [relationshipName, setRelationshipName] = useState(relationship?.relationshipName ?? '')
  const [relationshipDescription, setRelationshipDescription] = useState(
    relationship?.description ?? '',
  )
  const saving = status === 'saving'
  const suggestedApiName = label.trim() ? generateFieldApiName(label) : ''
  const relationshipObjects =
    dataType === 'master-detail'
      ? availableObjects.filter((candidate) => candidate.id !== object.id)
      : availableObjects
  const controllingFields = getControllingFields(availableFields, object.id, field?.id)
  const controllingField = controllingFields.find(
    (candidate) => candidate.id === controllingFieldId,
  )
  const controllingValues = controllingField
    ? getFieldValues(controllingField, globalValueSets)
    : []
  const dependentValues = globalValueSetId
    ? (globalValueSets
        .find((set) => set.id === globalValueSetId)
        ?.values.map((value) => value.apiValue) ?? [])
    : parseValueLines(picklistValues)
  const dependencyMappings: PicklistDependencyMapping[] = controllingValues.map((value) => ({
    controllingValue: value,
    dependentValues: (dependencySelections[value] ?? []).filter((candidate) =>
      dependentValues.includes(candidate),
    ),
  }))

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
      globalValueSetId: isPicklist(dataType) ? globalValueSetId : '',
      controllingFieldId: isPicklist(dataType) ? controllingFieldId : '',
      dependencyMappings,
      relationshipName,
      relationshipDescription,
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
            <PicklistConfiguration
              globalValueSets={globalValueSets}
              controllingFields={controllingFields}
              globalValueSetId={globalValueSetId}
              onGlobalValueSetChange={setGlobalValueSetId}
              picklistValues={picklistValues}
              onPicklistValuesChange={setPicklistValues}
              controllingFieldId={controllingFieldId}
              onControllingFieldChange={setControllingFieldId}
              dependencySelections={dependencySelections}
              onDependencySelectionsChange={setDependencySelections}
            />
          ) : null}

          {relationshipTypes.includes(dataType) ? (
            <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
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
              <Field label="Child relationship name" hint="Optional">
                <TextInput
                  maxLength={80}
                  value={relationshipName}
                  onChange={(event) => {
                    setRelationshipName(event.target.value)
                  }}
                  placeholder={label.trim().replace(/[^a-zA-Z0-9]+/g, '_') || 'Borrower'}
                />
              </Field>
              <Field label="Relationship description" hint="Optional">
                <TextArea
                  rows={2}
                  maxLength={500}
                  value={relationshipDescription}
                  onChange={(event) => {
                    setRelationshipDescription(event.target.value)
                  }}
                />
              </Field>
            </div>
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
            ) : ![
                'formula',
                'auto-number',
                'lookup',
                'master-detail',
                'external-lookup',
                'indirect-lookup',
              ].includes(dataType) ? (
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
  availableFields?: SalesforceField[]
  globalValueSets?: GlobalValueSet[]
  onClose: () => void
}) {
  return <FieldDialog {...props} />
}

function isPicklist(dataType: FieldDataType) {
  return dataType === 'picklist' || dataType === 'multi-select-picklist'
}
