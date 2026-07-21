import type {
  BlueprintFile,
  FieldDataType,
  ObjectKind,
  ObjectRelationship,
  PicklistValue,
  SalesforceField,
  SalesforceObject,
  Solution,
  SolutionVersion,
  UUID,
} from './blueprint'

export const APPLICATION_VERSION = '0.1.0'
export const SCHEMA_VERSION = '0.1.0'

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
    discovery: { format: 'html', content: '', assetIds: [] },
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
  if (isPicklist(input.dataType) && picklistValues.length === 0) {
    throw new Error('Picklist fields require at least one value')
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
  if (input.dataType === 'formula' && !compactText(input.formula)) {
    throw new Error('Formula fields require a formula expression')
  }
  validateFieldNumbers(input)

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
    ...(isPicklist(input.dataType) ? { localPicklistValues: picklistValues } : {}),
    governance: { tags: [] },
  }
  const relationship: ObjectRelationship | null = isRelationship(input.dataType)
    ? {
        id: createId(),
        fieldId,
        parentObjectId: input.referenceToObjectId,
        childObjectId: input.objectId,
        type: input.dataType,
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

function isRelationship(dataType: FieldDataType): dataType is 'lookup' | 'master-detail' {
  return dataType === 'lookup' || dataType === 'master-detail'
}

function createPicklistValues(values: string[], createId: () => UUID): PicklistValue[] {
  const uniqueValues = [...new Set(values.map(compactText).filter(Boolean))]
  return uniqueValues.map((label) => ({
    id: createId(),
    label,
    apiValue: label,
    active: true,
    default: false,
  }))
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
    project: { ...blueprint.project, updatedAt: timestamp },
    audit: { ...blueprint.audit, updatedAt: timestamp },
  }
}
