import type {
  BlueprintFile,
  GlobalValueSet,
  ObjectRelationship,
  PicklistValue,
  UUID,
} from './blueprint'
import {
  APPLICATION_VERSION,
  SCHEMA_VERSION,
  addField,
  deleteField,
  generateFieldApiName,
  getFieldDeleteDependencies,
  updateField,
} from './blueprintFactory'

export interface NewRelationshipInput {
  childObjectId: UUID
  parentObjectId: UUID
  type: ObjectRelationship['type']
  fieldLabel: string
  fieldApiName: string
  relationshipName: string
  description: string
  required: boolean
}

export interface NewGlobalValueSetInput {
  label: string
  apiName: string
  description: string
  sorted: boolean
  values: string[]
  defaultValue: string
}

interface ConnectedMetadataOptions {
  createId?: () => UUID
  now?: () => string
}

const compactText = (value: string) => value.trim()

export function addRelationship(
  blueprint: BlueprintFile,
  solutionId: UUID,
  input: NewRelationshipInput,
  options: ConnectedMetadataOptions = {},
): { blueprint: BlueprintFile; relationshipId: UUID; fieldId: UUID } {
  if (input.parentObjectId === input.childObjectId && input.type === 'master-detail') {
    throw new Error('Master-detail relationships cannot reference the same object')
  }
  const result = addField(
    blueprint,
    solutionId,
    {
      objectId: input.childObjectId,
      label: input.fieldLabel,
      apiName: input.fieldApiName,
      dataType: input.type,
      description: input.description,
      helpText: '',
      required: input.required,
      defaultValue: '',
      formula: '',
      referenceToObjectId: input.parentObjectId,
      picklistValues: [],
      relationshipName: input.relationshipName,
      relationshipDescription: input.description,
    },
    options,
  )
  const version = result.blueprint.solutions
    .find((solution) => solution.id === solutionId)
    ?.versions.at(-1)
  const relationship = version?.metadata.relationships.find(
    (candidate) => candidate.fieldId === result.fieldId,
  )
  if (!relationship) throw new Error('The relationship could not be created')
  return { ...result, relationshipId: relationship.id }
}

export function updateRelationship(
  blueprint: BlueprintFile,
  solutionId: UUID,
  relationshipId: UUID,
  input: NewRelationshipInput,
  options: ConnectedMetadataOptions = {},
): BlueprintFile {
  const version = getVersion(blueprint, solutionId)
  const relationship = version.metadata.relationships.find((item) => item.id === relationshipId)
  const field = version.metadata.fields.find((item) => item.id === relationship?.fieldId)
  if (!relationship || !field) throw new Error('The selected relationship could not be found')
  if (field.objectId !== input.childObjectId) {
    throw new Error('Move the field by recreating the relationship on the new child object')
  }
  if (input.parentObjectId === input.childObjectId && input.type === 'master-detail') {
    throw new Error('Master-detail relationships cannot reference the same object')
  }
  return updateField(
    blueprint,
    solutionId,
    field.id,
    {
      label: input.fieldLabel,
      apiName: input.fieldApiName,
      dataType: input.type,
      description: input.description,
      helpText: field.helpText ?? '',
      required: input.required,
      defaultValue: '',
      formula: '',
      referenceToObjectId: input.parentObjectId,
      picklistValues: [],
      relationshipName: input.relationshipName,
      relationshipDescription: input.description,
    },
    options,
  )
}

export function getRelationshipDeleteDependencies(
  blueprint: BlueprintFile,
  solutionId: UUID,
  relationshipId: UUID,
): string[] {
  const version = getVersion(blueprint, solutionId)
  const relationship = version.metadata.relationships.find((item) => item.id === relationshipId)
  if (!relationship) return []
  const field = version.metadata.fields.find((item) => item.id === relationship.fieldId)
  if (!field) return []
  const dependencies = getFieldDeleteDependencies(blueprint, solutionId, field.id)
  for (const requirement of version.requirements) {
    if (requirement.linkedArtifactIds.some((id) => id === field.id || id === relationship.id)) {
      dependencies.push(`Requirement: ${requirement.title}`)
    }
  }
  for (const decision of version.decisions) {
    if (decision.linkedArtifactIds.some((id) => id === field.id || id === relationship.id)) {
      dependencies.push(`Decision: ${decision.title}`)
    }
  }
  return [...new Set(dependencies)]
}

export function deleteRelationship(
  blueprint: BlueprintFile,
  solutionId: UUID,
  relationshipId: UUID,
  options: ConnectedMetadataOptions = {},
): BlueprintFile {
  const version = getVersion(blueprint, solutionId)
  const relationship = version.metadata.relationships.find((item) => item.id === relationshipId)
  if (!relationship) throw new Error('The selected relationship could not be found')
  const dependencies = getRelationshipDeleteDependencies(blueprint, solutionId, relationshipId)
  if (dependencies.length) {
    throw new Error('Remove this relationship from its linked artifacts before deleting it')
  }
  return deleteField(blueprint, solutionId, relationship.fieldId, options)
}

export function addGlobalValueSet(
  blueprint: BlueprintFile,
  solutionId: UUID,
  input: NewGlobalValueSetInput,
  options: ConnectedMetadataOptions = {},
): { blueprint: BlueprintFile; globalValueSetId: UUID } {
  const createId = options.createId ?? (() => crypto.randomUUID())
  const timestamp = (options.now ?? (() => new Date().toISOString()))()
  const version = getVersion(blueprint, solutionId)
  const globalValueSetId = createId()
  const valueSet = buildGlobalValueSet(input, globalValueSetId, createId)
  assertUniqueValueSet(version.metadata.globalValueSets, valueSet)
  return {
    globalValueSetId,
    blueprint: updateVersion(blueprint, solutionId, timestamp, (current) => ({
      ...current,
      metadata: {
        ...current.metadata,
        globalValueSets: [...current.metadata.globalValueSets, valueSet],
      },
    })),
  }
}

export function updateGlobalValueSet(
  blueprint: BlueprintFile,
  solutionId: UUID,
  globalValueSetId: UUID,
  input: NewGlobalValueSetInput,
  options: ConnectedMetadataOptions = {},
): BlueprintFile {
  const createId = options.createId ?? (() => crypto.randomUUID())
  const timestamp = (options.now ?? (() => new Date().toISOString()))()
  const version = getVersion(blueprint, solutionId)
  const existing = version.metadata.globalValueSets.find((item) => item.id === globalValueSetId)
  if (!existing) throw new Error('The selected global value set could not be found')
  const valueSet = buildGlobalValueSet(input, existing.id, createId, existing)
  assertUniqueValueSet(
    version.metadata.globalValueSets.filter((item) => item.id !== globalValueSetId),
    valueSet,
  )
  const removedValues = new Set(
    existing.values
      .filter(
        (value) =>
          !valueSet.values.some(
            (candidate) => candidate.apiValue.toLowerCase() === value.apiValue.toLowerCase(),
          ),
      )
      .map((value) => value.apiValue.toLowerCase()),
  )
  if (
    removedValues.size &&
    removedValueSetValuesAreMapped(version, globalValueSetId, removedValues)
  ) {
    throw new Error('Remove dependent picklist mappings before deleting referenced values')
  }
  return updateVersion(blueprint, solutionId, timestamp, (current) => ({
    ...current,
    metadata: {
      ...current.metadata,
      globalValueSets: current.metadata.globalValueSets.map((item) =>
        item.id === globalValueSetId ? valueSet : item,
      ),
    },
  }))
}

export function getGlobalValueSetDeleteDependencies(
  blueprint: BlueprintFile,
  solutionId: UUID,
  globalValueSetId: UUID,
): string[] {
  const version = getVersion(blueprint, solutionId)
  return version.metadata.fields
    .filter((field) => field.globalValueSetId === globalValueSetId)
    .map((field) => {
      const object = version.metadata.objects.find((item) => item.id === field.objectId)
      return `Field: ${object?.label ?? 'Unknown object'}.${field.label}`
    })
}

export function deleteGlobalValueSet(
  blueprint: BlueprintFile,
  solutionId: UUID,
  globalValueSetId: UUID,
  options: ConnectedMetadataOptions = {},
): BlueprintFile {
  const timestamp = (options.now ?? (() => new Date().toISOString()))()
  const version = getVersion(blueprint, solutionId)
  if (!version.metadata.globalValueSets.some((item) => item.id === globalValueSetId)) {
    throw new Error('The selected global value set could not be found')
  }
  if (getGlobalValueSetDeleteDependencies(blueprint, solutionId, globalValueSetId).length) {
    throw new Error('Move connected fields to local values or another value set before deleting it')
  }
  return updateVersion(blueprint, solutionId, timestamp, (current) => ({
    ...current,
    metadata: {
      ...current.metadata,
      globalValueSets: current.metadata.globalValueSets.filter(
        (item) => item.id !== globalValueSetId,
      ),
    },
  }))
}

export function generateGlobalValueSetApiName(label: string) {
  const normalized = compactText(label)
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return /^\d/.test(normalized) ? `X_${normalized}` : normalized
}

export function suggestedRelationshipName(fieldLabel: string) {
  return generateGlobalValueSetApiName(fieldLabel)
}

function buildGlobalValueSet(
  input: NewGlobalValueSetInput,
  id: UUID,
  createId: () => UUID,
  existing?: GlobalValueSet,
): GlobalValueSet {
  const label = compactText(input.label)
  if (!label) throw new Error('A global value set label is required')
  const apiName = compactText(input.apiName) || generateGlobalValueSetApiName(label)
  if (!apiName) throw new Error('The global value set API name is not valid')
  const values = createValues(input.values, input.defaultValue, createId, existing?.values)
  if (!values.length) throw new Error('Global value sets require at least one value')
  return {
    id,
    label,
    apiName,
    ...(compactText(input.description) ? { description: compactText(input.description) } : {}),
    sorted: input.sorted,
    values,
    governance: existing?.governance ?? { tags: [] },
  }
}

function createValues(
  labels: string[],
  defaultValue: string,
  createId: () => UUID,
  existing: PicklistValue[] = [],
) {
  const unique = [...new Set(labels.map(compactText).filter(Boolean))]
  const normalizedDefault = compactText(defaultValue).toLowerCase()
  if (normalizedDefault && !unique.some((value) => value.toLowerCase() === normalizedDefault)) {
    throw new Error('The default value must be included in the value set')
  }
  return unique.map((label) => {
    const current = existing.find((value) => value.apiValue.toLowerCase() === label.toLowerCase())
    return {
      id: current?.id ?? createId(),
      label,
      apiValue: label,
      active: current?.active ?? true,
      default: label.toLowerCase() === normalizedDefault,
      ...(current?.description ? { description: current.description } : {}),
    }
  })
}

function assertUniqueValueSet(existing: GlobalValueSet[], candidate: GlobalValueSet) {
  if (existing.some((item) => item.apiName?.toLowerCase() === candidate.apiName?.toLowerCase())) {
    throw new Error(
      `A global value set with the API name ${candidate.apiName ?? ''} already exists`,
    )
  }
}

function removedValueSetValuesAreMapped(
  version: ReturnType<typeof getVersion>,
  globalValueSetId: UUID,
  removedValues: Set<string>,
) {
  const fieldsUsingValueSet = version.metadata.fields.filter(
    (field) => field.globalValueSetId === globalValueSetId,
  )
  const fieldIds = new Set(fieldsUsingValueSet.map((field) => field.id))
  return version.metadata.fields.some((field) => {
    const dependency = field.picklistDependency
    if (!dependency) return false
    if (
      fieldsUsingValueSet.some((candidate) => candidate.id === field.id) &&
      dependency.mappings.some((mapping) =>
        mapping.dependentValues.some((value) => removedValues.has(value.toLowerCase())),
      )
    ) {
      return true
    }
    return (
      fieldIds.has(dependency.controllingFieldId) &&
      dependency.mappings.some((mapping) =>
        removedValues.has(mapping.controllingValue.toLowerCase()),
      )
    )
  })
}

function getVersion(blueprint: BlueprintFile, solutionId: UUID) {
  const version = blueprint.solutions
    .find((solution) => solution.id === solutionId)
    ?.versions.at(-1)
  if (!version) throw new Error('The selected solution could not be found')
  return version
}

function updateVersion(
  blueprint: BlueprintFile,
  solutionId: UUID,
  timestamp: string,
  update: (version: ReturnType<typeof getVersion>) => ReturnType<typeof getVersion>,
) {
  const solutions = blueprint.solutions.map((solution) => {
    if (solution.id !== solutionId) return solution
    const latest = solution.versions.at(-1)
    if (!latest) throw new Error('The selected solution has no design version')
    return {
      ...solution,
      versions: solution.versions.map((version) =>
        version.id === latest.id ? { ...update(version), updatedAt: timestamp } : version,
      ),
      updatedAt: timestamp,
    }
  })
  return {
    ...blueprint,
    schemaVersion: SCHEMA_VERSION,
    applicationVersion: APPLICATION_VERSION,
    solutions,
    project: { ...blueprint.project, updatedAt: timestamp },
    audit: { ...blueprint.audit, updatedAt: timestamp },
  }
}

export function relationshipFieldApiName(label: string) {
  return generateFieldApiName(label)
}
