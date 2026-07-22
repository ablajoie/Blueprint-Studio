import type { BlueprintFile, DiscoverySectionDocumentContent } from './blueprint'
import { APPLICATION_VERSION, SCHEMA_VERSION } from './version'

export const MAX_DISCOVERY_CONTENT_LENGTH = 8_000_000

interface DiscoveryUpdateOptions {
  now?: () => string
}

export function updateDiscoveryDocument(
  blueprint: BlueprintFile,
  solutionId: string,
  content: string | Record<string, string>,
  options: DiscoveryUpdateOptions = {},
): BlueprintFile {
  const contentSize = typeof content === 'string' ? content.length : JSON.stringify(content).length
  if (contentSize > MAX_DISCOVERY_CONTENT_LENGTH) {
    throw new Error('Discovery notes are too large. Remove one or more images and try again.')
  }

  const timestamp = (options.now ?? (() => new Date().toISOString()))()
  const selectedSolution = blueprint.solutions.find((solution) => solution.id === solutionId)
  if (!selectedSolution) throw new Error('The selected solution could not be found')
  if (!selectedSolution.versions.at(-1)) {
    throw new Error('The selected solution has no design version')
  }
  const solutions = blueprint.solutions.map((solution) => {
    if (solution.id !== solutionId) return solution
    const currentVersion = solution.versions.at(-1)
    if (!currentVersion) throw new Error('The selected solution has no design version')
    return {
      ...solution,
      updatedAt: timestamp,
      versions: solution.versions.map((version) =>
        version.id === currentVersion.id
          ? {
              ...version,
              discovery: createUpdatedDocument(version.discovery.assetIds, content),
              updatedAt: timestamp,
            }
          : version,
      ),
    }
  })

  return {
    ...blueprint,
    schemaVersion: SCHEMA_VERSION,
    applicationVersion: APPLICATION_VERSION,
    project: { ...blueprint.project, updatedAt: timestamp },
    solutions,
    audit: { ...blueprint.audit, updatedAt: timestamp },
  }
}

function createUpdatedDocument(assetIds: string[], content: string | Record<string, string>) {
  if (typeof content === 'string') return { format: 'html' as const, content, assetIds }
  const structuredContent: DiscoverySectionDocumentContent = { version: 1, sections: content }
  return { format: 'json-rich-text' as const, content: structuredContent, assetIds }
}
