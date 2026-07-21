import type {
  BlueprintFile,
  ObjectKind,
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

function touchBlueprint(blueprint: BlueprintFile, timestamp: string): BlueprintFile {
  return {
    ...blueprint,
    project: { ...blueprint.project, updatedAt: timestamp },
    audit: { ...blueprint.audit, updatedAt: timestamp },
  }
}
