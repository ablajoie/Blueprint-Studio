import type { GlobalValueSet, SalesforceField } from '../../domain/blueprint'

export function getControllingFields(
  fields: SalesforceField[],
  objectId: string,
  editingFieldId?: string,
) {
  return fields.filter(
    (candidate) =>
      candidate.id !== editingFieldId &&
      candidate.objectId === objectId &&
      (candidate.dataType === 'checkbox' || candidate.dataType === 'picklist'),
  )
}

export function getFieldValues(field: SalesforceField, globalValueSets: GlobalValueSet[]) {
  if (field.dataType === 'checkbox') return ['true', 'false']
  if (field.globalValueSetId) {
    return (
      globalValueSets
        .find((valueSet) => valueSet.id === field.globalValueSetId)
        ?.values.filter((value) => value.active)
        .map((value) => value.apiValue) ?? []
    )
  }
  return (
    field.localPicklistValues?.filter((value) => value.active).map((value) => value.apiValue) ?? []
  )
}

export function parseValueLines(value: string) {
  return [
    ...new Set(
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]
}
