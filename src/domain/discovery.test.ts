import { addSolution, createBlueprint } from './blueprintFactory'
import { MAX_DISCOVERY_CONTENT_LENGTH, updateDiscoveryDocument } from './discovery'

describe('discovery document', () => {
  it('updates the latest solution version while preserving asset references', () => {
    const project = createBlueprint(
      { name: 'Lending', description: '', clouds: [] },
      { now: () => '2026-01-01T00:00:00.000Z' },
    )
    const solution = addSolution(
      project,
      { name: 'Core model', description: '' },
      { now: () => '2026-01-01T00:00:00.000Z' },
    )
    const currentVersion = solution.blueprint.solutions[0]?.versions[0]
    expect(currentVersion).toBeDefined()
    if (!currentVersion) return
    currentVersion.discovery.assetIds = ['existing-asset']

    const updated = updateDiscoveryDocument(
      solution.blueprint,
      solution.solutionId,
      { 'discovery-overview': '<p>Capture the lending request.</p>' },
      { now: () => '2026-01-02T00:00:00.000Z' },
    )

    expect(updated.solutions[0]?.versions[0]?.discovery).toEqual({
      format: 'json-rich-text',
      content: {
        version: 1,
        sections: { 'discovery-overview': '<p>Capture the lending request.</p>' },
      },
      assetIds: ['existing-asset'],
    })
    expect(updated.project.updatedAt).toBe('2026-01-02T00:00:00.000Z')
  })

  it('rejects discovery content that would make the local project unsafe to save', () => {
    const project = createBlueprint({ name: 'Lending', description: '', clouds: [] })
    const solution = addSolution(project, { name: 'Core model', description: '' })

    expect(() =>
      updateDiscoveryDocument(solution.blueprint, solution.solutionId, {
        'discovery-overview': 'x'.repeat(MAX_DISCOVERY_CONTENT_LENGTH + 1),
      }),
    ).toThrow('Discovery notes are too large')
  })
})
