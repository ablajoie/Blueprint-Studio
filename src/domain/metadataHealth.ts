import type { SolutionVersion } from './blueprint'

export interface MetadataHealthIssue {
  id: string
  message: string
  severity: 'warning' | 'error'
}

export function getMetadataHealthIssues(version: SolutionVersion): MetadataHealthIssue[] {
  const issues: MetadataHealthIssue[] = []
  const objectIds = new Set(version.metadata.objects.map((object) => object.id))
  const fieldIds = new Set(version.metadata.fields.map((field) => field.id))
  const valueSets = new Map(
    version.metadata.globalValueSets.map((valueSet) => [valueSet.id, valueSet]),
  )

  for (const relationship of version.metadata.relationships) {
    if (
      !fieldIds.has(relationship.fieldId) ||
      !objectIds.has(relationship.parentObjectId) ||
      !objectIds.has(relationship.childObjectId)
    ) {
      issues.push({
        id: `relationship:${relationship.id}`,
        severity: 'error',
        message: 'A relationship references an object or field that no longer exists.',
      })
    }
  }

  for (const valueSet of version.metadata.globalValueSets) {
    if (!valueSet.values.some((value) => value.active)) {
      issues.push({
        id: `value-set:${valueSet.id}`,
        severity: 'warning',
        message: `${valueSet.label} has no active values.`,
      })
    }
  }

  for (const field of version.metadata.fields) {
    if (field.globalValueSetId && !valueSets.has(field.globalValueSetId)) {
      issues.push({
        id: `field-value-set:${field.id}`,
        severity: 'error',
        message: `${field.label} references a missing global value set.`,
      })
    }
    const dependency = field.picklistDependency
    if (!dependency) continue
    const controller = version.metadata.fields.find(
      (candidate) => candidate.id === dependency.controllingFieldId,
    )
    if (!controller || controller.objectId !== field.objectId) {
      issues.push({
        id: `field-controller:${field.id}`,
        severity: 'error',
        message: `${field.label} references a missing or invalid controlling field.`,
      })
    } else if (!dependency.mappings.some((mapping) => mapping.dependentValues.length)) {
      issues.push({
        id: `field-mapping:${field.id}`,
        severity: 'warning',
        message: `${field.label} has no dependent value mappings.`,
      })
    }
  }

  return issues
}
