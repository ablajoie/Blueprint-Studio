import { addObject, addSolution, createBlueprint } from './blueprintFactory'
import { summarizeProject } from './projectSummary'

describe('summarizeProject', () => {
  it('reports the current solution, object, and field totals for a project', () => {
    const project = createBlueprint({ name: 'Lending', description: '', clouds: [] })
    const solution = addSolution(project, { name: 'Origination', description: '' })
    const object = addObject(solution.blueprint, solution.solutionId, {
      label: 'Facility',
      pluralLabel: 'Facilities',
      apiName: '',
      kind: 'custom',
      description: '',
    })

    expect(summarizeProject(object.blueprint)).toMatchObject({
      project: { name: 'Lending' },
      solutionCount: 1,
      objectCount: 1,
      fieldCount: 0,
    })
  })
})
