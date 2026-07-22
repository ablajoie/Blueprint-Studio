import { Field, Select, TextArea } from '../../components/ui/FormControls'
import type { GlobalValueSet, SalesforceField } from '../../domain/blueprint'
import { getFieldValues, parseValueLines } from './picklistConfigurationModel'

export function PicklistConfiguration({
  globalValueSets,
  controllingFields,
  globalValueSetId,
  onGlobalValueSetChange,
  picklistValues,
  onPicklistValuesChange,
  controllingFieldId,
  onControllingFieldChange,
  dependencySelections,
  onDependencySelectionsChange,
}: {
  globalValueSets: GlobalValueSet[]
  controllingFields: SalesforceField[]
  globalValueSetId: string
  onGlobalValueSetChange: (id: string) => void
  picklistValues: string
  onPicklistValuesChange: (values: string) => void
  controllingFieldId: string
  onControllingFieldChange: (id: string) => void
  dependencySelections: Record<string, string[]>
  onDependencySelectionsChange: (value: Record<string, string[]>) => void
}) {
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

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <Field label="Value source">
        <Select
          value={globalValueSetId}
          onChange={(event) => {
            onGlobalValueSetChange(event.target.value)
            onDependencySelectionsChange({})
          }}
        >
          <option value="">Values defined on this field</option>
          {globalValueSets.map((valueSet) => (
            <option key={valueSet.id} value={valueSet.id}>
              Global: {valueSet.label}
            </option>
          ))}
        </Select>
      </Field>
      {!globalValueSetId ? (
        <Field label="Picklist values" hint="One value per line">
          <TextArea
            rows={5}
            required
            value={picklistValues}
            onChange={(event) => {
              onPicklistValuesChange(event.target.value)
            }}
            placeholder={'Draft\nSubmitted\nApproved'}
          />
        </Field>
      ) : (
        <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
          This field will reuse{' '}
          {globalValueSets.find((set) => set.id === globalValueSetId)?.values.length ?? 0} governed
          values.
        </p>
      )}
      <Field
        label="Controlling field"
        hint="Optional — connect this picklist to a checkbox or picklist on the same object"
      >
        <Select
          value={controllingFieldId}
          onChange={(event) => {
            onControllingFieldChange(event.target.value)
            onDependencySelectionsChange({})
          }}
        >
          <option value="">Not a dependent picklist</option>
          {controllingFields.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.label}
            </option>
          ))}
        </Select>
      </Field>
      {controllingFieldId ? (
        controllingValues.length && dependentValues.length ? (
          <DependencyMatrix
            controllingValues={controllingValues}
            dependentValues={dependentValues}
            selections={dependencySelections}
            onChange={onDependencySelectionsChange}
          />
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Add values to both fields before mapping the dependency.
          </p>
        )
      ) : null}
    </div>
  )
}

function DependencyMatrix({
  controllingValues,
  dependentValues,
  selections,
  onChange,
}: {
  controllingValues: string[]
  dependentValues: string[]
  selections: Record<string, string[]>
  onChange: (value: Record<string, string[]>) => void
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">Value dependency mapping</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Choose which dependent values are available for each controlling value.
      </p>
      <div className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="sticky left-0 bg-slate-50 px-3 py-2 font-semibold">Controlling</th>
              {dependentValues.map((value) => (
                <th key={value} className="min-w-24 px-3 py-2 text-center font-semibold">
                  {value}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {controllingValues.map((controllingValue) => (
              <tr key={controllingValue}>
                <th className="sticky left-0 bg-white px-3 py-2 font-semibold text-slate-700">
                  {controllingValue}
                </th>
                {dependentValues.map((dependentValue) => {
                  const checked = (selections[controllingValue] ?? []).includes(dependentValue)
                  return (
                    <td key={dependentValue} className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${controllingValue}: ${dependentValue}`}
                        checked={checked}
                        className="size-4 accent-blue-700"
                        onChange={(event) => {
                          const current = selections[controllingValue] ?? []
                          onChange({
                            ...selections,
                            [controllingValue]: event.target.checked
                              ? [...current, dependentValue]
                              : current.filter((value) => value !== dependentValue),
                          })
                        }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
