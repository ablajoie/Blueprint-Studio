import { addField, addObject, addSolution, createBlueprint } from './blueprintFactory'
import {
  deleteObject,
  deleteSolution,
  duplicateSolution,
  getObjectDeleteImpact,
  getProjectDeleteImpact,
  getSolutionDeleteImpact,
  setSolutionArchived,
  updateObject,
  updateProject,
  updateSolution,
} from './blueprintLifecycle'

const createId = (() => {
  let next = 1000
  return () => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`
})()
const now = () => '2026-07-21T16:00:00.000Z'

function createLendingModel() {
  const project = createBlueprint(
    { name: 'Commercial Lending', description: '', clouds: ['Sales Cloud'] },
    { createId, now },
  )
  const solution = addSolution(
    project,
    { name: 'Borrowing Structure', description: 'Original solution' },
    { createId, now },
  )
  const account = addObject(
    solution.blueprint,
    solution.solutionId,
    {
      label: 'Account',
      pluralLabel: 'Accounts',
      apiName: 'Account',
      kind: 'standard',
      description: '',
    },
    { createId, now },
  )
  const facility = addObject(
    account.blueprint,
    solution.solutionId,
    {
      label: 'Facility',
      pluralLabel: 'Facilities',
      apiName: '',
      kind: 'custom',
      description: 'A lending facility',
    },
    { createId, now },
  )
  const borrower = addField(
    facility.blueprint,
    solution.solutionId,
    {
      objectId: facility.objectId,
      label: 'Borrower',
      apiName: '',
      dataType: 'lookup',
      description: '',
      helpText: '',
      required: false,
      defaultValue: '',
      formula: '',
      referenceToObjectId: account.objectId,
      picklistValues: [],
    },
    { createId, now },
  )
  return {
    ...borrower,
    solutionId: solution.solutionId,
    accountId: account.objectId,
    facilityId: facility.objectId,
  }
}

describe('blueprint lifecycle', () => {
  it('updates project, solution, and object details without changing their identities', () => {
    const model = createLendingModel()
    const project = updateProject(
      model.blueprint,
      {
        name: 'Commercial Lending Modernization',
        description: 'Modernize lending capabilities',
        clouds: ['Financial Services Cloud', 'Data Cloud'],
      },
      { now },
    )
    const solution = updateSolution(
      project,
      model.solutionId,
      { name: 'Borrowing Structure 2.0', description: 'Revised solution' },
      { now },
    )
    const object = updateObject(
      solution,
      model.solutionId,
      model.facilityId,
      {
        label: 'Credit Facility',
        pluralLabel: 'Credit Facilities',
        apiName: 'Credit_Facility__c',
        kind: 'custom',
        description: 'Revised object',
      },
      { now },
    )

    expect(object.project).toMatchObject({
      id: model.blueprint.project.id,
      name: 'Commercial Lending Modernization',
      clouds: ['Financial Services Cloud', 'Data Cloud'],
    })
    expect(object.solutions[0]).toMatchObject({
      id: model.solutionId,
      name: 'Borrowing Structure 2.0',
    })
    expect(object.solutions[0]?.versions[0]?.metadata.objects[1]).toMatchObject({
      id: model.facilityId,
      label: 'Credit Facility',
      apiName: 'Credit_Facility__c',
    })
  })

  it('duplicates a complete solution with new stable IDs and remapped relationships', () => {
    const model = createLendingModel()
    const duplicated = duplicateSolution(model.blueprint, model.solutionId, { createId, now })
    const original = duplicated.blueprint.solutions[0]
    const copy = duplicated.blueprint.solutions[1]
    const originalVersion = original?.versions[0]
    const copyVersion = copy?.versions[0]

    expect(copy).toMatchObject({ id: duplicated.solutionId, name: 'Borrowing Structure Copy' })
    expect(copy?.id).not.toBe(original?.id)
    expect(copyVersion?.id).not.toBe(originalVersion?.id)
    expect(copyVersion?.metadata.objects.map((object) => object.id)).not.toEqual(
      originalVersion?.metadata.objects.map((object) => object.id),
    )
    const copiedField = copyVersion?.metadata.fields[0]
    const copiedRelationship = copyVersion?.metadata.relationships[0]
    expect(copiedRelationship?.fieldId).toBe(copiedField?.id)
    expect(copiedRelationship?.childObjectId).toBe(copiedField?.objectId)
    expect(copiedRelationship?.parentObjectId).toBe(copiedField?.referenceToObjectId)
  })

  it('prevents deleting referenced objects and cascades content owned by a safe object', () => {
    const model = createLendingModel()
    expect(getObjectDeleteImpact(model.blueprint, model.solutionId, model.accountId)).toMatchObject(
      {
        blockers: ['Relationship field: Borrower'],
      },
    )
    expect(() => deleteObject(model.blueprint, model.solutionId, model.accountId)).toThrow(
      'Remove relationship fields that reference this object before deleting it',
    )

    const deleted = deleteObject(model.blueprint, model.solutionId, model.facilityId, { now })
    const version = deleted.solutions[0]?.versions[0]
    expect(version?.metadata.objects.map((object) => object.label)).toEqual(['Account'])
    expect(version?.metadata.fields).toEqual([])
    expect(version?.metadata.relationships).toEqual([])
  })

  it('reports project and solution deletion impact and supports archive and deletion', () => {
    const model = createLendingModel()
    expect(getProjectDeleteImpact(model.blueprint).consequences).toEqual([
      '1 solution',
      '2 objects',
      '1 field',
    ])
    expect(getSolutionDeleteImpact(model.blueprint, model.solutionId).consequences).toEqual([
      '1 design version',
      '2 objects',
      '1 field',
    ])

    const archived = setSolutionArchived(model.blueprint, model.solutionId, true, { now })
    expect(archived.solutions[0]?.versions[0]?.status).toBe('archived')
    const restored = setSolutionArchived(archived, model.solutionId, false, { now })
    expect(restored.solutions[0]?.versions[0]?.status).toBe('discovery')
    const deleted = deleteSolution(restored, model.solutionId, { now })
    expect(deleted.solutions).toEqual([])
    expect(deleted.extensions.lifecycle).toEqual({ archivedSolutionStatuses: {} })
  })
})
