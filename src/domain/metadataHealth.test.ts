import type { SolutionVersion } from './blueprint'
import { addSolution, createBlueprint } from './blueprintFactory'
import { getMetadataHealthIssues } from './metadataHealth'

it('reports broken connected metadata without mutating the design', () => {
  const project = createBlueprint({ name: 'Health', description: '', clouds: [] })
  const result = addSolution(project, { name: 'Review', description: '' })
  const version = result.blueprint.solutions[0]?.versions[0] as SolutionVersion
  const broken: SolutionVersion = {
    ...version,
    metadata: {
      ...version.metadata,
      relationships: [
        {
          id: 'relationship-missing',
          fieldId: 'field-missing',
          parentObjectId: 'parent-missing',
          childObjectId: 'child-missing',
          type: 'lookup',
        },
      ],
    },
  }
  const issues = getMetadataHealthIssues(broken)
  expect(issues).toHaveLength(1)
  expect(issues[0]?.severity).toBe('error')
  expect(issues[0]?.message).toContain('relationship')
})
