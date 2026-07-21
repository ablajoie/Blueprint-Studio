import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import schema from '../../schemas/blueprint.schema.json'
import { addObject, addSolution, createBlueprint, generateApiName } from './blueprintFactory'

const createId = (() => {
  let next = 0
  return () => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`
})()
const now = () => '2026-07-21T12:00:00.000Z'

describe('blueprintFactory', () => {
  it('creates the first project, solution, and object as a valid connected model', () => {
    const project = createBlueprint(
      { name: ' Commercial Lending ', description: '', clouds: ['Sales Cloud'] },
      { createId, now },
    )
    const solution = addSolution(
      project,
      { name: ' Borrowing Structure ', description: 'Model lending relationships' },
      { createId, now },
    )
    const result = addObject(
      solution.blueprint,
      solution.solutionId,
      {
        label: 'Borrowing Structure',
        pluralLabel: 'Borrowing Structures',
        apiName: '',
        kind: 'custom',
        description: '',
      },
      { createId, now },
    )

    const createdSolution = result.blueprint.solutions[0]
    const object = createdSolution?.versions[0]?.metadata.objects[0]
    expect(result.blueprint.project.name).toBe('Commercial Lending')
    expect(createdSolution?.projectId).toBe(result.blueprint.project.id)
    expect(object).toMatchObject({
      label: 'Borrowing Structure',
      apiName: 'Borrowing_Structure__c',
      kind: 'custom',
    })

    const validator = new Ajv2020({ allErrors: true, strict: true })
    addFormats(validator)
    expect(validator.validate(schema, result.blueprint), validator.errorsText()).toBe(true)
  })

  it('generates Salesforce suffixes for supported object kinds', () => {
    expect(generateApiName('Loan Event', 'platform-event')).toBe('Loan_Event__e')
    expect(generateApiName('Loan Configuration', 'custom-metadata-type')).toBe(
      'Loan_Configuration__mdt',
    )
  })
})
