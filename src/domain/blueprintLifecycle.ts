import type {
  BlueprintFile,
  SalesforceObject,
  Solution,
  SolutionStatus,
  SolutionVersion,
  UUID,
} from './blueprint'
import {
  generateApiName,
  type NewObjectInput,
  type NewProjectInput,
  type NewSolutionInput,
} from './blueprintFactory'

interface LifecycleOptions {
  createId?: () => UUID
  now?: () => string
}

export interface DeletionImpact {
  blockers: string[]
  consequences: string[]
}

export function updateProject(
  blueprint: BlueprintFile,
  input: NewProjectInput,
  options: LifecycleOptions = {},
): BlueprintFile {
  const timestamp = getTimestamp(options)
  const name = input.name.trim()
  if (!name) throw new Error('A project name is required')
  const project = {
    ...blueprint.project,
    name,
    clouds: [...new Set(input.clouds)],
    updatedAt: timestamp,
  }
  const description = input.description.trim()
  if (description) project.description = description
  else delete project.description

  return {
    ...blueprint,
    project,
    audit: { ...blueprint.audit, updatedAt: timestamp },
  }
}

export function updateSolution(
  blueprint: BlueprintFile,
  solutionId: UUID,
  input: NewSolutionInput,
  options: LifecycleOptions = {},
): BlueprintFile {
  const timestamp = getTimestamp(options)
  const name = input.name.trim()
  if (!name) throw new Error('A solution name is required')
  if (!blueprint.solutions.some((solution) => solution.id === solutionId)) {
    throw new Error('The selected solution could not be found')
  }

  const solutions = blueprint.solutions.map((solution) => {
    if (solution.id !== solutionId) return solution
    const updated = { ...solution, name, updatedAt: timestamp }
    const description = input.description.trim()
    if (description) updated.description = description
    else delete updated.description
    return updated
  })
  return touchBlueprint({ ...blueprint, solutions }, timestamp)
}

export function duplicateSolution(
  blueprint: BlueprintFile,
  solutionId: UUID,
  options: LifecycleOptions = {},
): { blueprint: BlueprintFile; solutionId: UUID } {
  const source = blueprint.solutions.find((solution) => solution.id === solutionId)
  if (!source) throw new Error('The selected solution could not be found')

  const createId = options.createId ?? (() => crypto.randomUUID())
  const timestamp = getTimestamp(options)
  const copy = structuredClone(source)
  const idMap = new Map<UUID, UUID>()
  collectIds(copy, idMap, createId)
  remapIds(copy, idMap)

  copy.name = nextCopyName(
    source.name,
    blueprint.solutions.map((solution) => solution.name),
  )
  copy.createdAt = timestamp
  copy.updatedAt = timestamp
  copy.versions = copy.versions.map((version) => ({
    ...version,
    status: version.status === 'archived' ? 'draft' : version.status,
    createdAt: timestamp,
    updatedAt: timestamp,
  }))

  const result = touchBlueprint(
    { ...blueprint, solutions: [...blueprint.solutions, copy] },
    timestamp,
  )
  return { blueprint: result, solutionId: copy.id }
}

export function setSolutionArchived(
  blueprint: BlueprintFile,
  solutionId: UUID,
  archived: boolean,
  options: LifecycleOptions = {},
): BlueprintFile {
  const timestamp = getTimestamp(options)
  const solution = blueprint.solutions.find((item) => item.id === solutionId)
  const latestVersion = solution?.versions.at(-1)
  if (!solution || !latestVersion) throw new Error('The selected solution could not be found')
  const archivedStatuses = getArchivedSolutionStatuses(blueprint)
  const restoredStatus = getRestoredStatus(archivedStatuses[solutionId])

  const solutions = blueprint.solutions.map((item) => {
    if (item.id !== solutionId) return item
    return {
      ...item,
      versions: item.versions.map((version) =>
        version.id === latestVersion.id
          ? {
              ...version,
              status: archived ? ('archived' as const) : restoredStatus,
              updatedAt: timestamp,
            }
          : version,
      ),
      updatedAt: timestamp,
    }
  })
  const nextArchivedStatuses = Object.fromEntries(
    Object.entries(archivedStatuses).filter(([id]) => archived || id !== solutionId),
  ) as Record<UUID, SolutionStatus>
  if (archived && latestVersion.status !== 'archived') {
    nextArchivedStatuses[solutionId] = latestVersion.status
  }
  return touchBlueprint(
    {
      ...blueprint,
      solutions,
      extensions: {
        ...blueprint.extensions,
        lifecycle: {
          ...getLifecycleExtension(blueprint),
          archivedSolutionStatuses: nextArchivedStatuses,
        },
      },
    },
    timestamp,
  )
}

export function getProjectDeleteImpact(blueprint: BlueprintFile): DeletionImpact {
  const versions = blueprint.solutions.flatMap((solution) => solution.versions)
  return {
    blockers: [],
    consequences: compactCounts([
      [blueprint.solutions.length, 'solution'],
      [versions.reduce((count, version) => count + version.metadata.objects.length, 0), 'object'],
      [versions.reduce((count, version) => count + version.metadata.fields.length, 0), 'field'],
      [versions.reduce((count, version) => count + version.experience.layouts.length, 0), 'layout'],
    ]),
  }
}

export function getSolutionDeleteImpact(
  blueprint: BlueprintFile,
  solutionId: UUID,
): DeletionImpact {
  const solution = blueprint.solutions.find((item) => item.id === solutionId)
  if (!solution) return { blockers: [], consequences: [] }
  return {
    blockers: [],
    consequences: compactCounts([
      [solution.versions.length, 'design version'],
      [sumVersions(solution.versions, (version) => version.metadata.objects.length), 'object'],
      [sumVersions(solution.versions, (version) => version.metadata.fields.length), 'field'],
      [sumVersions(solution.versions, (version) => version.experience.layouts.length), 'layout'],
      [sumVersions(solution.versions, (version) => version.requirements.length), 'requirement'],
      [sumVersions(solution.versions, (version) => version.decisions.length), 'decision'],
    ]),
  }
}

export function deleteSolution(
  blueprint: BlueprintFile,
  solutionId: UUID,
  options: LifecycleOptions = {},
): BlueprintFile {
  if (!blueprint.solutions.some((solution) => solution.id === solutionId)) {
    throw new Error('The selected solution could not be found')
  }
  const timestamp = getTimestamp(options)
  const archivedSolutionStatuses = Object.fromEntries(
    Object.entries(getArchivedSolutionStatuses(blueprint)).filter(([id]) => id !== solutionId),
  ) as Record<UUID, SolutionStatus>
  return touchBlueprint(
    {
      ...blueprint,
      solutions: blueprint.solutions.filter((solution) => solution.id !== solutionId),
      extensions: {
        ...blueprint.extensions,
        lifecycle: {
          ...getLifecycleExtension(blueprint),
          archivedSolutionStatuses,
        },
      },
    },
    timestamp,
  )
}

export function updateObject(
  blueprint: BlueprintFile,
  solutionId: UUID,
  objectId: UUID,
  input: NewObjectInput,
  options: LifecycleOptions = {},
): BlueprintFile {
  const timestamp = getTimestamp(options)
  const solution = blueprint.solutions.find((item) => item.id === solutionId)
  const version = solution?.versions.at(-1)
  const existing = version?.metadata.objects.find((object) => object.id === objectId)
  if (!solution || !version || !existing) throw new Error('The selected object could not be found')

  const label = input.label.trim()
  if (!label) throw new Error('An object label is required')
  const apiName = input.apiName.trim() || generateApiName(label, input.kind)
  if (
    version.metadata.objects.some(
      (object) => object.id !== objectId && object.apiName?.toLowerCase() === apiName.toLowerCase(),
    )
  ) {
    throw new Error(`An object with the API name ${apiName} already exists in this solution`)
  }

  const updatedObject: SalesforceObject = {
    ...existing,
    label,
    apiName,
    kind: input.kind,
  }
  const pluralLabel = input.pluralLabel.trim()
  if (pluralLabel) updatedObject.pluralLabel = pluralLabel
  else delete updatedObject.pluralLabel
  const description = input.description.trim()
  if (description) updatedObject.description = description
  else delete updatedObject.description
  const solutions = blueprint.solutions.map((item) =>
    item.id === solutionId
      ? updateLatestVersion(item, version.id, timestamp, (candidate) => ({
          ...candidate,
          metadata: {
            ...candidate.metadata,
            objects: candidate.metadata.objects.map((object) =>
              object.id === objectId ? updatedObject : object,
            ),
          },
        }))
      : item,
  )
  return touchBlueprint({ ...blueprint, solutions }, timestamp)
}

export function getObjectDeleteImpact(
  blueprint: BlueprintFile,
  solutionId: UUID,
  objectId: UUID,
): DeletionImpact {
  const solution = blueprint.solutions.find((item) => item.id === solutionId)
  const version = solution?.versions.at(-1)
  if (!version) return { blockers: [], consequences: [] }

  const object = version.metadata.objects.find((item) => item.id === objectId)
  if (!object) return { blockers: [], consequences: [] }
  const ownedFields = version.metadata.fields.filter((field) => field.objectId === objectId)
  const ownedFieldIds = new Set(ownedFields.map((field) => field.id))
  const incomingFields = version.metadata.fields.filter(
    (field) => field.objectId !== objectId && field.referenceToObjectId === objectId,
  )
  const layouts = version.experience.layouts.filter((layout) => layout.objectId === objectId)
  const recordTypes = version.metadata.recordTypes.filter(
    (recordType) => recordType.objectId === objectId,
  )
  const validationRules = version.metadata.validationRules.filter(
    (rule) => rule.objectId === objectId,
  )
  const securityAssignments = version.security.fieldAccess.filter((assignment) =>
    ownedFieldIds.has(assignment.fieldId),
  )

  return {
    blockers: incomingFields.map((field) => `Relationship field: ${field.label}`),
    consequences: compactCounts([
      [ownedFields.length, 'field'],
      [layouts.length, 'layout'],
      [recordTypes.length, 'record type'],
      [validationRules.length, 'validation rule'],
      [securityAssignments.length, 'security assignment'],
    ]),
  }
}

export function deleteObject(
  blueprint: BlueprintFile,
  solutionId: UUID,
  objectId: UUID,
  options: LifecycleOptions = {},
): BlueprintFile {
  const timestamp = getTimestamp(options)
  const solution = blueprint.solutions.find((item) => item.id === solutionId)
  const version = solution?.versions.at(-1)
  if (!solution || !version || !version.metadata.objects.some((object) => object.id === objectId)) {
    throw new Error('The selected object could not be found')
  }
  const impact = getObjectDeleteImpact(blueprint, solutionId, objectId)
  if (impact.blockers.length) {
    throw new Error('Remove relationship fields that reference this object before deleting it')
  }

  const ownedFieldIds = new Set(
    version.metadata.fields.filter((field) => field.objectId === objectId).map((field) => field.id),
  )
  const deletedArtifactIds = new Set<UUID>([objectId, ...ownedFieldIds])
  const solutions = blueprint.solutions.map((item) =>
    item.id === solutionId
      ? updateLatestVersion(item, version.id, timestamp, (candidate) => ({
          ...candidate,
          metadata: {
            ...candidate.metadata,
            objects: candidate.metadata.objects.filter((object) => object.id !== objectId),
            fields: candidate.metadata.fields.filter((field) => field.objectId !== objectId),
            relationships: candidate.metadata.relationships.filter(
              (relationship) =>
                relationship.parentObjectId !== objectId && relationship.childObjectId !== objectId,
            ),
            recordTypes: candidate.metadata.recordTypes.filter(
              (recordType) => recordType.objectId !== objectId,
            ),
            validationRules: candidate.metadata.validationRules.filter(
              (rule) => rule.objectId !== objectId,
            ),
          },
          experience: {
            ...candidate.experience,
            layouts: candidate.experience.layouts
              .filter((layout) => layout.objectId !== objectId)
              .map((layout) => ({
                ...layout,
                sections: layout.sections.map((section) => ({
                  ...section,
                  items: section.items.filter(
                    (layoutItem) =>
                      !layoutItem.artifactId || !deletedArtifactIds.has(layoutItem.artifactId),
                  ),
                })),
              })),
          },
          security: {
            ...candidate.security,
            fieldAccess: candidate.security.fieldAccess.filter(
              (assignment) => !ownedFieldIds.has(assignment.fieldId),
            ),
          },
          requirements: candidate.requirements.map((requirement) => ({
            ...requirement,
            linkedArtifactIds: requirement.linkedArtifactIds.filter(
              (artifactId) => !deletedArtifactIds.has(artifactId),
            ),
          })),
          decisions: candidate.decisions.map((decision) => ({
            ...decision,
            linkedArtifactIds: decision.linkedArtifactIds.filter(
              (artifactId) => !deletedArtifactIds.has(artifactId),
            ),
          })),
        }))
      : item,
  )
  return touchBlueprint({ ...blueprint, solutions }, timestamp)
}

function collectIds(value: unknown, idMap: Map<UUID, UUID>, createId: () => UUID): void {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item) => {
      collectIds(item, idMap, createId)
    })
    return
  }
  const record = value as Record<string, unknown>
  if (typeof record.id === 'string') idMap.set(record.id, createId())
  Object.values(record).forEach((item) => {
    collectIds(item, idMap, createId)
  })
}

function remapIds(value: unknown, idMap: Map<UUID, UUID>): void {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item) => {
      remapIds(item, idMap)
    })
    return
  }
  const record = value as Record<string, unknown>
  for (const [key, item] of Object.entries(record)) {
    if (typeof item === 'string') {
      const replacement = idMap.get(item)
      if (replacement !== undefined) record[key] = replacement
    } else remapIds(item, idMap)
  }
}

function updateLatestVersion(
  solution: Solution,
  versionId: UUID,
  timestamp: string,
  update: (version: SolutionVersion) => SolutionVersion,
): Solution {
  return {
    ...solution,
    versions: solution.versions.map((version) =>
      version.id === versionId ? { ...update(version), updatedAt: timestamp } : version,
    ),
    updatedAt: timestamp,
  }
}

function nextCopyName(name: string, existingNames: string[]): string {
  const names = new Set(existingNames.map((item) => item.toLowerCase()))
  let copyNumber = 1
  let candidate = `${name} Copy`
  while (names.has(candidate.toLowerCase())) {
    copyNumber += 1
    candidate = `${name} Copy ${String(copyNumber)}`
  }
  return candidate
}

function compactCounts(counts: [number, string][]): string[] {
  return counts
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${String(count)} ${label}${count === 1 ? '' : 's'}`)
}

function sumVersions(versions: SolutionVersion[], count: (version: SolutionVersion) => number) {
  return versions.reduce((total, version) => total + count(version), 0)
}

function getTimestamp(options: LifecycleOptions) {
  return (options.now ?? (() => new Date().toISOString()))()
}

function getArchivedSolutionStatuses(blueprint: BlueprintFile): Record<UUID, SolutionStatus> {
  const statuses = getLifecycleExtension(blueprint).archivedSolutionStatuses
  if (!statuses || typeof statuses !== 'object' || Array.isArray(statuses)) return {}
  return statuses as Record<UUID, SolutionStatus>
}

function getLifecycleExtension(blueprint: BlueprintFile): Record<string, unknown> {
  const lifecycle = blueprint.extensions.lifecycle
  if (!lifecycle || typeof lifecycle !== 'object' || Array.isArray(lifecycle)) return {}
  return lifecycle as Record<string, unknown>
}

function getRestoredStatus(value: SolutionStatus | undefined): SolutionStatus {
  return value && value !== 'archived' ? value : 'draft'
}

function touchBlueprint(blueprint: BlueprintFile, timestamp: string): BlueprintFile {
  return {
    ...blueprint,
    project: { ...blueprint.project, updatedAt: timestamp },
    audit: { ...blueprint.audit, updatedAt: timestamp },
  }
}
