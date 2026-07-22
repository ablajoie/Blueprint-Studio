import type {
  BlueprintFile,
  DiscoveryDocument,
  DiscoverySectionDefinition,
  DiscoverySectionDocumentContent,
  ProjectSettings,
} from './blueprint'
import { APPLICATION_VERSION, SCHEMA_VERSION } from './version'

export const MAX_DISCOVERY_SECTIONS = 24

const defaultSections: DiscoverySectionDefinition[] = [
  {
    id: 'discovery-overview',
    title: 'Overview',
    description:
      'Capture the objective, desired outcomes, context, and high-level design direction.',
    enabled: true,
    contentType: 'rich-text',
  },
  {
    id: 'discovery-personas',
    title: 'Personas',
    description:
      'Identify who the solution serves and the goals or pain points that matter to them.',
    enabled: true,
    contentType: 'table',
    tableColumns: ['Persona', 'Goals', 'Needs or pain points'],
  },
  {
    id: 'discovery-workflow',
    title: 'Workflow',
    description: 'Describe the current or proposed process before translating it into automation.',
    enabled: true,
    contentType: 'table',
    tableColumns: ['Step', 'Actor', 'Action', 'Outcome'],
  },
  {
    id: 'discovery-data',
    title: 'Data',
    description:
      'Capture important data concepts, sources, ownership, and likely Salesforce homes.',
    enabled: true,
    contentType: 'table',
    tableColumns: ['Data element', 'Salesforce location', 'Source or owner', 'Notes'],
  },
  {
    id: 'discovery-requirements',
    title: 'Requirements',
    description:
      'Record build-ready needs that can later connect to formal requirements and user stories.',
    enabled: true,
    contentType: 'table',
    tableColumns: ['ID', 'Requirement or user story', 'Acceptance criteria', 'Status'],
  },
  {
    id: 'discovery-security',
    title: 'Security',
    description:
      'Document who needs access, what they can see or change, and any sensitive-data concerns.',
    enabled: true,
    contentType: 'table',
    tableColumns: ['Persona or access group', 'Object or data', 'Access needed', 'Notes'],
  },
  {
    id: 'discovery-risks',
    title: 'Risks & Dependencies',
    description:
      'Track risks, assumptions, dependencies, owners, and the plan for addressing them.',
    enabled: true,
    contentType: 'table',
    tableColumns: ['Risk or dependency', 'Impact', 'Mitigation', 'Owner'],
  },
  {
    id: 'discovery-questions',
    title: 'Questions',
    description:
      'Keep unresolved questions visible and preserve the accepted answer and decision date.',
    enabled: true,
    contentType: 'table',
    tableColumns: ['Question', 'Answer', 'Date answer accepted'],
  },
  {
    id: 'discovery-out-of-scope',
    title: 'Out of Scope',
    description:
      'Make boundaries explicit and note whether excluded items should be reconsidered later.',
    enabled: true,
    contentType: 'table',
    tableColumns: ['Item', 'Reason', 'Revisit later?'],
  },
]

export function createDefaultDiscoverySections(): DiscoverySectionDefinition[] {
  return structuredClone(defaultSections)
}

export function resolveDiscoverySections(
  settings: Pick<ProjectSettings, 'discoverySections'> | undefined,
): DiscoverySectionDefinition[] {
  const configured = settings?.discoverySections
  return configured?.length ? structuredClone(configured) : createDefaultDiscoverySections()
}

export function createDiscoveryDocument(settings: ProjectSettings): DiscoveryDocument {
  const sections = Object.fromEntries(
    resolveDiscoverySections(settings).map((section) => [
      section.id,
      createSectionStarter(section),
    ]),
  )
  return { format: 'json-rich-text', content: { version: 1, sections }, assetIds: [] }
}

export function readDiscoverySectionContent(
  document: DiscoveryDocument,
  definitions: DiscoverySectionDefinition[],
): Record<string, string> {
  const stored = readStructuredSections(document.content)
  const legacyContent =
    document.format === 'html' && typeof document.content === 'string' ? document.content : ''
  const firstEnabledId = definitions.find((section) => section.enabled)?.id

  return Object.fromEntries(
    definitions.map((section) => [
      section.id,
      stored[section.id] ??
        (section.id === firstEnabledId && legacyContent
          ? legacyContent
          : createSectionStarter(section)),
    ]),
  )
}

export function updateDiscoverySectionSettings(
  blueprint: BlueprintFile,
  sections: DiscoverySectionDefinition[],
  now = () => new Date().toISOString(),
): BlueprintFile {
  const normalized = normalizeSections(sections)
  const timestamp = now()
  return {
    ...blueprint,
    schemaVersion: SCHEMA_VERSION,
    applicationVersion: APPLICATION_VERSION,
    project: { ...blueprint.project, updatedAt: timestamp },
    settings: { ...blueprint.settings, discoverySections: normalized },
    audit: { ...blueprint.audit, updatedAt: timestamp },
  }
}

export function createCustomDiscoverySection(): DiscoverySectionDefinition {
  return {
    id: crypto.randomUUID(),
    title: 'New section',
    description: 'Explain what the team should capture in this section.',
    enabled: true,
    contentType: 'rich-text',
  }
}

function normalizeSections(sections: DiscoverySectionDefinition[]): DiscoverySectionDefinition[] {
  if (!sections.length) throw new Error('Keep at least one Discovery section')
  if (sections.length > MAX_DISCOVERY_SECTIONS) {
    throw new Error(`Discovery supports up to ${String(MAX_DISCOVERY_SECTIONS)} sections`)
  }
  const ids = new Set<string>()
  return sections.map((section) => {
    const title = section.title.trim()
    const description = section.description.trim()
    if (!title) throw new Error('Every Discovery section needs a title')
    if (title.length > 80)
      throw new Error('Discovery section titles must be 80 characters or fewer')
    if (description.length > 280) {
      throw new Error('Discovery section descriptions must be 280 characters or fewer')
    }
    if (ids.has(section.id)) throw new Error('Discovery section IDs must be unique')
    ids.add(section.id)
    const tableColumns =
      section.contentType === 'table' ? normalizeColumns(section.tableColumns) : undefined
    return {
      id: section.id,
      title,
      description,
      enabled: section.enabled,
      contentType: section.contentType,
      ...(tableColumns ? { tableColumns } : {}),
    }
  })
}

function normalizeColumns(columns: string[] | undefined): string[] {
  const normalized = (columns ?? [])
    .map((column) => column.trim())
    .filter(Boolean)
    .slice(0, 8)
  return normalized.length ? normalized : ['Topic', 'Notes', 'Owner']
}

function createSectionStarter(section: DiscoverySectionDefinition): string {
  if (section.contentType !== 'table') return ''
  const columns = normalizeColumns(section.tableColumns)
  return `<table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody><tr>${columns.map(() => '<td><br></td>').join('')}</tr></tbody></table><p><br></p>`
}

function readStructuredSections(content: DiscoveryDocument['content']): Record<string, string> {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return {}
  const candidate = content as Partial<DiscoverySectionDocumentContent>
  if (candidate.version !== 1 || !candidate.sections || typeof candidate.sections !== 'object') {
    return {}
  }
  return Object.fromEntries(
    Object.entries(candidate.sections).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
