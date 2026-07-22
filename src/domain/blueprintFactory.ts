import type {
  BlueprintFile,
  FieldDataType,
  ObjectKind,
  ObjectRelationship,
  PicklistDependencyMapping,
  PicklistValue,
  SalesforceField,
  SalesforceObject,
  Solution,
  SolutionVersion,
  UUID,
} from './blueprint'
import { createDefaultDiscoverySections, createDiscoveryDocument } from './discoveryTemplate'
import { APPLICATION_VERSION, SCHEMA_VERSION } from './version'

export { APPLICATION_VERSION, SCHEMA_VERSION } from './version'

export interface NewProjectInput {
  name: string
  description: string
  clouds: string[]
}

export interface NewSolutionInput {
  name: string
  description: string
}

export interface NewObjectInput {
  label: string
  pluralLabel: string
  apiName: string
  kind: ObjectKind
  description: string
}

export interface NewFieldInput {
  objectId: UUID
  label: string
  apiName: string
  dataType: FieldDataType
  description: string
  helpText: string
  required: boolean
  defaultValue: string
  length?: number
  precision?: number
  scale?: number
  formula: string
  referenceToObjectId: string
  picklistValues: string[]
  globalValueSetId?: string
  controllingFieldId?: string
  dependencyMappings?: PicklistDependencyMapping[]
  relationshipName?: string
  relationshipDescription?: string
}

interface FactoryOptions {
  createId?: () => UUID
  now?: () => string
}

const compactText = (value: string) => value.trim()

const optionalText = (key: string, value: string) => {
  const trimmed = compactText(value)
  return trimmed ? { [key]: trimmed } : {}
}

export function createBlueprint(
  input: NewProjectInput,
  options: FactoryOptions = {},
): BlueprintFile {
  const createId = options.createId ?? (() => crypto.randomUUID())
  const timestamp = (options.now ?? (() => new Date().toISOString()))()
  const projectId = createId()

  return {
    format: 'blueprint-studio',
    schemaVersion: SCHEMA_VERSION,
    applicationVersion: APPLICATION_VERSION,
    project: {
      id: projectId,
      name: compactText(input.name),
      ...optionalText('description', input.description),
      clouds: [...new Set(input.clouds)],
      status: 'active',
      tags: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    solutions: [],
    settings: {
      namingStrategy: 'hybrid',
      autoGenerateApiNames: true,
      healthRules: [],
      discoverySections: createDefaultDiscoverySections(),
    },
    templates: [],
    audit: {
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    extensions: {},
  }
}

export function addSolution(
  blueprint: BlueprintFile,
  input: NewSolutionInput,
  options: FactoryOptions = {},
): { blueprint: BlueprintFile; solutionId: UUID } {
  const createId = options.createId ?? (() => crypto.randomUUID())
  const timestamp = (options.now ?? (() => new Date().toISOString()))()
  const solutionId = createId()
  const version: SolutionVersion = {
    id: createId(),
    solutionId,
    number: '0.1',
    status: 'discovery',
    discovery: createDiscoveryDocument(blueprint.settings),
    requirements: [],
    metadata: {
      objects: [],
      fields: [],
      relationships: [],
      globalValueSets: [],
      customLabels: [],
      recordTypes: [],
      validationRules: [],
    },
    experience: { layouts: [] },
    security: { profiles: [], permissionSets: [], permissionSetGroups: [], fieldAccess: [] },
    decisions: [],
    healthRuleOverrides: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const solution: Solution = {
    id: solutionId,
    projectId: blueprint.project.id,
    name: compactText(input.name),
    ...optionalText('description', input.description),
    versions: [version],
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return {
    solutionId,
    blueprint: touchBlueprint(
      { ...blueprint, solutions: [...blueprint.solutions, solution] },
      timestamp,
    ),
  }
}

export function addObject(
  blueprint: BlueprintFile,
  solutionId: UUID,
  input: NewObjectInput,
  options: FactoryOptions = {},
): { blueprint: BlueprintFile; objectId: UUID } {
  const createId = options.createId ?? (() => crypto.randomUUID())
  const timestamp = (options.now ?? (() => new Date().toISOString()))()
  const objectId = createId()
  const object: SalesforceObject = {
    id: objectId,
    origin: { type: 'created' },
    label: compactText(input.label),
    ...optionalText('pluralLabel', input.pluralLabel),
    apiName: compactText(input.apiName) || generateApiName(input.label, input.kind),
    kind: input.kind,
    ...optionalText('description', input.description),
    deploymentStatus: 'in-development',
    governance: { tags: [] },
  }
  if (!blueprint.solutions.some((solution) => solution.id === solutionId)) {
    throw new Error('The selected solution could not be found')
  }
  const solutions = blueprint.solutions.map((solution) => {
    if (solution.id !== solutionId) return solution
    const currentVersion = solution.versions.at(-1)
    if (!currentVersion) throw new Error('The selected solution has no design version')
    const versions = solution.versions.map((version) =>
      version.id === currentVersion.id
        ? {
            ...version,
            metadata: {
              ...version.metadata,
              objects: [...version.metadata.objects, object],
            },
            updatedAt: timestamp,
          }
        : version,
    )
    return { ...solution, versions, updatedAt: timestamp }
  })

  return {
    objectId,
    blueprint: touchBlueprint({ ...blueprint, solutions }, timestamp),
  }
}

export function addField(
  blueprint: BlueprintFile,
  solutionId: UUID,
  input: NewFieldInput,
  options: FactoryOptions = {},
): { blueprint: BlueprintFile; fieldId: UUID } {
  const createId = options.createId ?? (() => crypto.randomUUID())
  const timestamp = (options.now ?? (() => new Date().toISOString()))()
  const solution = blueprint.solutions.find((item) => item.id === solutionId)
  const version = solution?.versions.at(-1)
  if (!solution || !version) throw new Error('The selected solution could not be found')
  if (!version.metadata.objects.some((object) => object.id === input.objectId)) {
    throw new Error('The selected object could not be found')
  }

  const label = compactText(input.label)
  if (!label) throw new Error('A field label is required')

  const apiName = compactText(input.apiName) || generateFieldApiName(input.label)
  if (!apiName.replace(/__c$/i, '')) throw new Error('The field API name is not valid')
  if (
    version.metadata.fields.some(
      (field) =>
        field.objectId === input.objectId && field.apiName?.toLowerCase() === apiName.toLowerCase(),
    )
  ) {
    throw new Error(`A field with the API name ${apiName} already exists on this object`)
  }

  const picklistValues = createPicklistValues(input.picklistValues, createId)
  validateFieldDefinition(version, input, picklistValues)

  const fieldId = createId()
  const field: SalesforceField = {
    id: fieldId,
    objectId: input.objectId,
    origin: { type: 'created' },
    label,
    apiName,
    dataType: input.dataType,
    ...optionalText('description', input.description),
    ...optionalText('helpText', input.helpText),
    required: input.dataType === 'master-detail' || input.required,
    ...optionalDefaultValue(input.defaultValue, input.dataType),
    ...optionalNumber('length', input.length),
    ...optionalNumber('precision', input.precision),
    ...optionalNumber('scale', input.scale),
    ...optionalText('formula', input.formula),
    ...(isRelationship(input.dataType) ? { referenceToObjectId: input.referenceToObjectId } : {}),
    ...(isPicklist(input.dataType) && input.globalValueSetId
      ? { globalValueSetId: input.globalValueSetId }
      : {}),
    ...(isPicklist(input.dataType) && !input.globalValueSetId
      ? { localPicklistValues: picklistValues }
      : {}),
    ...picklistDependency(input),
    governance: { tags: [] },
  }
  const relationship: ObjectRelationship | null = isRelationship(input.dataType)
    ? {
        id: createId(),
        fieldId,
        parentObjectId: input.referenceToObjectId,
        childObjectId: input.objectId,
        type: input.dataType,
        ...optionalText('relationshipName', input.relationshipName ?? ''),
        ...optionalText('description', input.relationshipDescription ?? ''),
      }
    : null

  const solutions = blueprint.solutions.map((item) => {
    if (item.id !== solutionId) return item
    const versions = item.versions.map((candidate) =>
      candidate.id === version.id
        ? {
            ...candidate,
            metadata: {
              ...candidate.metadata,
              fields: [...candidate.metadata.fields, field],
              relationships: relationship
                ? [...candidate.metadata.relationships, relationship]
                : candidate.metadata.relationships,
            },
            updatedAt: timestamp,
          }
        : candidate,
    )
    return { ...item, versions, updatedAt: timestamp }
  })

  return {
    fieldId,
    blueprint: touchBlueprint({ ...blueprint, solutions }, timestamp),
  }
}

export function updateField(
  blueprint: BlueprintFile,
  solutionId: UUID,
  fieldId: UUID,
  input: Omit<NewFieldInput, 'objectId'>,
  options: FactoryOptions = {},
): BlueprintFile {
  const createId = options.createId ?? (() => crypto.randomUUID())
  const timestamp = (options.now ?? (() => new Date().toISOString()))()
  const solution = blueprint.solutions.find((item) => item.id === solutionId)
  const version = solution?.versions.at(-1)
  const existingField = version?.metadata.fields.find((field) => field.id === fieldId)
  if (!solution || !version || !existingField) {
    throw new Error('The selected field could not be found')
  }

  const completeInput: NewFieldInput = { ...input, objectId: existingField.objectId }
  const label = compactText(completeInput.label)
  if (!label) throw new Error('A field label is required')
  const apiName = compactText(completeInput.apiName) || generateFieldApiName(label)
  if (!apiName.replace(/__c$/i, '')) throw new Error('The field API name is not valid')
  if (
    version.metadata.fields.some(
      (field) =>
        field.id !== fieldId &&
        field.objectId === existingField.objectId &&
        field.apiName?.toLowerCase() === apiName.toLowerCase(),
    )
  ) {
    throw new Error(`A field with the API name ${apiName} already exists on this object`)
  }

  const picklistValues = createPicklistValues(
    completeInput.picklistValues,
    createId,
    existingField.localPicklistValues,
  )
  if (completeInput.controllingFieldId === fieldId) {
    throw new Error('A dependent picklist cannot control itself')
  }
  validateFieldDefinition(version, completeInput, picklistValues)
  validateControllerChange(version, fieldId, completeInput, picklistValues)

  const updatedField: SalesforceField = {
    id: existingField.id,
    objectId: existingField.objectId,
    origin: existingField.origin,
    label,
    apiName,
    dataType: completeInput.dataType,
    ...optionalText('description', completeInput.description),
    ...optionalText('helpText', completeInput.helpText),
    required: completeInput.dataType === 'master-detail' || completeInput.required,
    ...optionalDefaultValue(completeInput.defaultValue, completeInput.dataType),
    ...optionalNumber('length', completeInput.length),
    ...optionalNumber('precision', completeInput.precision),
    ...optionalNumber('scale', completeInput.scale),
    ...(existingField.unique === undefined ? {} : { unique: existingField.unique }),
    ...(existingField.externalId === undefined ? {} : { externalId: existingField.externalId }),
    ...optionalText('formula', completeInput.formula),
    ...(isRelationship(completeInput.dataType)
      ? { referenceToObjectId: completeInput.referenceToObjectId }
      : {}),
    ...(isPicklist(completeInput.dataType) && completeInput.globalValueSetId
      ? { globalValueSetId: completeInput.globalValueSetId }
      : {}),
    ...(isPicklist(completeInput.dataType) && !completeInput.globalValueSetId
      ? { localPicklistValues: picklistValues }
      : {}),
    ...picklistDependency(completeInput),
    governance: existingField.governance,
  }
  const existingRelationship = version.metadata.relationships.find(
    (relationship) => relationship.fieldId === fieldId,
  )
  const updatedRelationship: ObjectRelationship | null = isRelationship(completeInput.dataType)
    ? {
        id: existingRelationship?.id ?? createId(),
        fieldId,
        parentObjectId: completeInput.referenceToObjectId,
        childObjectId: existingField.objectId,
        type: completeInput.dataType,
        ...optionalText(
          'relationshipName',
          completeInput.relationshipName ?? existingRelationship?.relationshipName ?? '',
        ),
        ...optionalText(
          'description',
          completeInput.relationshipDescription ?? existingRelationship?.description ?? '',
        ),
      }
    : null

  const solutions = blueprint.solutions.map((item) => {
    if (item.id !== solutionId) return item
    const versions = item.versions.map((candidate) => {
      if (candidate.id !== version.id) return candidate
      const relationships = candidate.metadata.relationships.filter(
        (relationship) => relationship.fieldId !== fieldId,
      )
      return {
        ...candidate,
        metadata: {
          ...candidate.metadata,
          fields: candidate.metadata.fields.map((field) =>
            field.id === fieldId ? updatedField : field,
          ),
          relationships: updatedRelationship
            ? [...relationships, updatedRelationship]
            : relationships,
        },
        updatedAt: timestamp,
      }
    })
    return { ...item, versions, updatedAt: timestamp }
  })

  return touchBlueprint({ ...blueprint, solutions }, timestamp)
}

export function duplicateField(
  blueprint: BlueprintFile,
  solutionId: UUID,
  fieldId: UUID,
  options: FactoryOptions = {},
): { blueprint: BlueprintFile; fieldId: UUID } {
  const solution = blueprint.solutions.find((item) => item.id === solutionId)
  const version = solution?.versions.at(-1)
  const field = version?.metadata.fields.find((item) => item.id === fieldId)
  if (!field || !version) throw new Error('The selected field could not be found')

  let copyNumber = 1
  let label = `${field.label} Copy`
  let apiName = generateFieldApiName(label)
  const hasApiName = (candidate: string) =>
    version.metadata.fields.some(
      (item) =>
        item.objectId === field.objectId && item.apiName?.toLowerCase() === candidate.toLowerCase(),
    )
  while (hasApiName(apiName)) {
    copyNumber += 1
    label = `${field.label} Copy ${String(copyNumber)}`
    apiName = generateFieldApiName(label)
  }

  return addField(
    blueprint,
    solutionId,
    {
      objectId: field.objectId,
      label,
      apiName,
      dataType: field.dataType,
      description: field.description ?? '',
      helpText: field.helpText ?? '',
      required: field.required,
      defaultValue:
        field.defaultValue === undefined || field.defaultValue === null
          ? ''
          : String(field.defaultValue),
      ...(field.length === undefined ? {} : { length: field.length }),
      ...(field.precision === undefined ? {} : { precision: field.precision }),
      ...(field.scale === undefined ? {} : { scale: field.scale }),
      formula: field.formula ?? '',
      referenceToObjectId: field.referenceToObjectId ?? '',
      picklistValues: field.localPicklistValues?.map((value) => value.label) ?? [],
      ...(field.globalValueSetId ? { globalValueSetId: field.globalValueSetId } : {}),
      ...(field.picklistDependency
        ? {
            controllingFieldId: field.picklistDependency.controllingFieldId,
            dependencyMappings: field.picklistDependency.mappings,
          }
        : {}),
    },
    options,
  )
}

export function getFieldDeleteDependencies(
  blueprint: BlueprintFile,
  solutionId: UUID,
  fieldId: UUID,
): string[] {
  const solution = blueprint.solutions.find((item) => item.id === solutionId)
  const version = solution?.versions.at(-1)
  if (!version) return []

  const dependencies: string[] = []
  for (const layout of version.experience.layouts) {
    const usesField = layout.sections.some((section) =>
      section.items.some(
        (item) =>
          item.artifactId === fieldId ||
          item.visibilityRule?.conditions.some((condition) => condition.fieldId === fieldId),
      ),
    )
    if (usesField) dependencies.push(`Layout: ${layout.name}`)
  }
  for (const rule of version.metadata.validationRules) {
    if (rule.fieldId === fieldId) dependencies.push(`Validation rule: ${rule.name}`)
  }
  for (const assignment of version.security.fieldAccess) {
    if (assignment.fieldId !== fieldId) continue
    const principals = [...version.security.profiles, ...version.security.permissionSets]
    const principal = principals.find((item) => item.id === assignment.principalId)
    dependencies.push(`Security assignment: ${principal?.name ?? assignment.principalId}`)
  }
  for (const requirement of version.requirements) {
    if (requirement.linkedArtifactIds.includes(fieldId)) {
      dependencies.push(`Requirement: ${requirement.title}`)
    }
  }
  for (const decision of version.decisions) {
    if (decision.linkedArtifactIds.includes(fieldId)) {
      dependencies.push(`Decision: ${decision.title}`)
    }
  }
  for (const dependentField of version.metadata.fields) {
    if (dependentField.picklistDependency?.controllingFieldId === fieldId) {
      dependencies.push(`Dependent field: ${dependentField.label}`)
    }
  }
  return [...new Set(dependencies)]
}

export function deleteField(
  blueprint: BlueprintFile,
  solutionId: UUID,
  fieldId: UUID,
  options: FactoryOptions = {},
): BlueprintFile {
  const timestamp = (options.now ?? (() => new Date().toISOString()))()
  const solution = blueprint.solutions.find((item) => item.id === solutionId)
  const version = solution?.versions.at(-1)
  if (!solution || !version || !version.metadata.fields.some((field) => field.id === fieldId)) {
    throw new Error('The selected field could not be found')
  }
  const dependencies = getFieldDeleteDependencies(blueprint, solutionId, fieldId)
  if (dependencies.length) {
    throw new Error('Remove this field from its linked artifacts before deleting it')
  }

  const solutions = blueprint.solutions.map((item) => {
    if (item.id !== solutionId) return item
    const versions = item.versions.map((candidate) =>
      candidate.id === version.id
        ? {
            ...candidate,
            metadata: {
              ...candidate.metadata,
              fields: candidate.metadata.fields.filter((field) => field.id !== fieldId),
              relationships: candidate.metadata.relationships.filter(
                (relationship) => relationship.fieldId !== fieldId,
              ),
            },
            updatedAt: timestamp,
          }
        : candidate,
    )
    return { ...item, versions, updatedAt: timestamp }
  })
  return touchBlueprint({ ...blueprint, solutions }, timestamp)
}

export function generateApiName(label: string, kind: ObjectKind): string {
  const normalized = compactText(label)
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const safeName = /^\d/.test(normalized) ? `X_${normalized}` : normalized
  const suffix: Partial<Record<ObjectKind, string>> = {
    custom: '__c',
    external: '__x',
    'big-object': '__b',
    'platform-event': '__e',
    'custom-metadata-type': '__mdt',
  }
  return `${safeName}${suffix[kind] ?? ''}`
}

export function generateFieldApiName(label: string): string {
  const normalized = compactText(label)
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const safeName = /^\d/.test(normalized) ? `X_${normalized}` : normalized
  return `${safeName}__c`
}

function isPicklist(dataType: FieldDataType) {
  return dataType === 'picklist' || dataType === 'multi-select-picklist'
}

function isRelationship(
  dataType: FieldDataType,
): dataType is 'lookup' | 'master-detail' | 'external-lookup' | 'indirect-lookup' {
  return (
    dataType === 'lookup' ||
    dataType === 'master-detail' ||
    dataType === 'external-lookup' ||
    dataType === 'indirect-lookup'
  )
}

function createPicklistValues(
  values: string[],
  createId: () => UUID,
  existingValues: PicklistValue[] = [],
): PicklistValue[] {
  const uniqueValues = [...new Set(values.map(compactText).filter(Boolean))]
  return uniqueValues.map((label) => {
    const existing = existingValues.find(
      (value) => value.apiValue.toLowerCase() === label.toLowerCase(),
    )
    return existing
      ? { ...existing, label, apiValue: label }
      : {
          id: createId(),
          label,
          apiValue: label,
          active: true,
          default: false,
        }
  })
}

function validateFieldDefinition(
  version: SolutionVersion,
  input: NewFieldInput,
  picklistValues: PicklistValue[],
) {
  if (isPicklist(input.dataType) && !input.globalValueSetId && picklistValues.length === 0) {
    throw new Error('Picklist fields require at least one value')
  }
  if (
    isPicklist(input.dataType) &&
    input.globalValueSetId &&
    !version.metadata.globalValueSets.some((valueSet) => valueSet.id === input.globalValueSetId)
  ) {
    throw new Error('The selected global value set could not be found')
  }
  if (isRelationship(input.dataType) && !input.referenceToObjectId) {
    throw new Error('Relationship fields require a related object')
  }
  if (
    isRelationship(input.dataType) &&
    !version.metadata.objects.some((object) => object.id === input.referenceToObjectId)
  ) {
    throw new Error('The related object could not be found')
  }
  if (input.dataType === 'master-detail' && input.objectId === input.referenceToObjectId) {
    throw new Error('Master-detail relationships cannot reference the same object')
  }
  if (input.dataType === 'formula' && !compactText(input.formula)) {
    throw new Error('Formula fields require a formula expression')
  }
  validatePicklistDependency(version, input, picklistValues)
  validateFieldNumbers(input)
}

function picklistDependency(input: NewFieldInput) {
  if (!isPicklist(input.dataType) || !input.controllingFieldId) return {}
  return {
    picklistDependency: {
      controllingFieldId: input.controllingFieldId,
      mappings: (input.dependencyMappings ?? []).map((mapping) => ({
        controllingValue: compactText(mapping.controllingValue),
        dependentValues: [...new Set(mapping.dependentValues.map(compactText).filter(Boolean))],
      })),
    },
  }
}

function validatePicklistDependency(
  version: SolutionVersion,
  input: NewFieldInput,
  localValues: PicklistValue[],
) {
  if (!input.controllingFieldId) return
  if (!isPicklist(input.dataType)) {
    throw new Error('Only picklist fields can be dependent fields')
  }
  const controllingField = version.metadata.fields.find(
    (field) => field.id === input.controllingFieldId,
  )
  if (!controllingField || controllingField.objectId !== input.objectId) {
    throw new Error('The controlling field must exist on the same object')
  }
  if (controllingField.dataType !== 'checkbox' && controllingField.dataType !== 'picklist') {
    throw new Error('Controlling fields must be a checkbox or picklist')
  }
  const mappings = input.dependencyMappings ?? []
  if (!mappings.some((mapping) => mapping.dependentValues.length)) {
    throw new Error('Dependent picklists require at least one value mapping')
  }
  const dependentValues = new Set(
    (input.globalValueSetId
      ? (version.metadata.globalValueSets.find((set) => set.id === input.globalValueSetId)
          ?.values ?? [])
      : localValues
    ).map((value) => value.apiValue.toLowerCase()),
  )
  if (
    mappings.some((mapping) =>
      mapping.dependentValues.some((value) => !dependentValues.has(value.toLowerCase())),
    )
  ) {
    throw new Error('A dependent mapping references a value that is not available')
  }
  const controllingValues = new Set(
    getPersistedFieldValues(version, controllingField).map((value) => value.toLowerCase()),
  )
  if (
    mappings.some(
      (mapping) =>
        compactText(mapping.controllingValue) &&
        !controllingValues.has(compactText(mapping.controllingValue).toLowerCase()),
    )
  ) {
    throw new Error('A dependency mapping references an unavailable controlling value')
  }
}

function validateControllerChange(
  version: SolutionVersion,
  fieldId: UUID,
  input: NewFieldInput,
  localValues: PicklistValue[],
) {
  const dependents = version.metadata.fields.filter(
    (field) => field.picklistDependency?.controllingFieldId === fieldId,
  )
  if (!dependents.length) return
  if (input.dataType !== 'checkbox' && input.dataType !== 'picklist') {
    throw new Error('Change dependent fields before changing this controlling field type')
  }
  const availableValues = new Set(
    (input.dataType === 'checkbox'
      ? ['true', 'false']
      : input.globalValueSetId
        ? (version.metadata.globalValueSets
            .find((valueSet) => valueSet.id === input.globalValueSetId)
            ?.values.map((value) => value.apiValue) ?? [])
        : localValues.map((value) => value.apiValue)
    ).map((value) => value.toLowerCase()),
  )
  const hasRemovedMapping = dependents.some((dependent) =>
    dependent.picklistDependency?.mappings.some(
      (mapping) => !availableValues.has(mapping.controllingValue.toLowerCase()),
    ),
  )
  if (hasRemovedMapping) {
    throw new Error('Update dependent value mappings before removing controlling values')
  }
}

function getPersistedFieldValues(version: SolutionVersion, field: SalesforceField) {
  if (field.dataType === 'checkbox') return ['true', 'false']
  if (field.globalValueSetId) {
    return (
      version.metadata.globalValueSets
        .find((valueSet) => valueSet.id === field.globalValueSetId)
        ?.values.filter((value) => value.active)
        .map((value) => value.apiValue) ?? []
    )
  }
  return (
    field.localPicklistValues?.filter((value) => value.active).map((value) => value.apiValue) ?? []
  )
}

function optionalNumber(key: string, value: number | undefined) {
  return value === undefined ? {} : { [key]: value }
}

function validateFieldNumbers(input: NewFieldInput) {
  if (input.length !== undefined && (!Number.isInteger(input.length) || input.length < 1)) {
    throw new Error('Field length must be a positive whole number')
  }
  if (
    input.precision !== undefined &&
    (!Number.isInteger(input.precision) || input.precision < 1 || input.precision > 18)
  ) {
    throw new Error('Field precision must be a whole number from 1 to 18')
  }
  if (
    input.scale !== undefined &&
    (!Number.isInteger(input.scale) || input.scale < 0 || input.scale > 18)
  ) {
    throw new Error('Decimal places must be a whole number from 0 to 18')
  }
  if (input.precision !== undefined && input.scale !== undefined && input.scale > input.precision) {
    throw new Error('Decimal places cannot exceed field precision')
  }
}

function optionalDefaultValue(value: string, dataType: FieldDataType) {
  const trimmed = compactText(value)
  if (!trimmed) return {}
  if (dataType === 'checkbox') return { defaultValue: trimmed === 'true' }
  if (dataType === 'number' || dataType === 'currency' || dataType === 'percent') {
    const numericValue = Number(trimmed)
    if (!Number.isFinite(numericValue)) throw new Error('The default value must be a number')
    return { defaultValue: numericValue }
  }
  return { defaultValue: trimmed }
}

function touchBlueprint(blueprint: BlueprintFile, timestamp: string): BlueprintFile {
  return {
    ...blueprint,
    schemaVersion: SCHEMA_VERSION,
    applicationVersion: APPLICATION_VERSION,
    project: { ...blueprint.project, updatedAt: timestamp },
    audit: { ...blueprint.audit, updatedAt: timestamp },
  }
}
