import {
  addField,
  addObject,
  addSolution,
  createBlueprint,
  getFieldDeleteDependencies,
  updateField,
} from './blueprintFactory'
import {
  addGlobalValueSet,
  addRelationship,
  deleteGlobalValueSet,
  deleteRelationship,
  getGlobalValueSetDeleteDependencies,
  updateGlobalValueSet,
  updateRelationship,
} from './connectedMetadata'

const now = () => '2026-07-21T18:00:00.000Z'

function createModel() {
  let next = 0
  const createId = () => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`
  const project = createBlueprint(
    { name: 'Connected metadata', description: '', clouds: ['Sales Cloud'] },
    { createId, now },
  )
  const solution = addSolution(project, { name: 'Lending', description: '' }, { createId, now })
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
      description: '',
    },
    { createId, now },
  )
  return {
    blueprint: facility.blueprint,
    solutionId: solution.solutionId,
    accountId: account.objectId,
    facilityId: facility.objectId,
    options: { createId, now },
  }
}

describe('connected metadata', () => {
  it('creates, updates, and deletes a relationship with its underlying field', () => {
    const model = createModel()
    const created = addRelationship(
      model.blueprint,
      model.solutionId,
      {
        childObjectId: model.facilityId,
        parentObjectId: model.accountId,
        type: 'lookup',
        fieldLabel: 'Borrower',
        fieldApiName: '',
        relationshipName: 'Facilities',
        description: 'Connects the facility to its borrower.',
        required: true,
      },
      model.options,
    )
    const version = created.blueprint.solutions[0]?.versions[0]
    expect(version?.metadata.relationships[0]).toMatchObject({
      id: created.relationshipId,
      fieldId: created.fieldId,
      parentObjectId: model.accountId,
      childObjectId: model.facilityId,
      relationshipName: 'Facilities',
    })
    expect(version?.metadata.fields[0]).toMatchObject({
      id: created.fieldId,
      label: 'Borrower',
      dataType: 'lookup',
      required: true,
    })

    const updated = updateRelationship(
      created.blueprint,
      model.solutionId,
      created.relationshipId,
      {
        childObjectId: model.facilityId,
        parentObjectId: model.accountId,
        type: 'external-lookup',
        fieldLabel: 'Primary Borrower',
        fieldApiName: 'Primary_Borrower__c',
        relationshipName: 'Borrowing_Facilities',
        description: 'Updated relationship design.',
        required: false,
      },
      model.options,
    )
    expect(updated.solutions[0]?.versions[0]?.metadata.relationships[0]).toMatchObject({
      id: created.relationshipId,
      type: 'external-lookup',
      relationshipName: 'Borrowing_Facilities',
    })

    const deleted = deleteRelationship(
      updated,
      model.solutionId,
      created.relationshipId,
      model.options,
    )
    expect(deleted.solutions[0]?.versions[0]?.metadata.relationships).toEqual([])
    expect(deleted.solutions[0]?.versions[0]?.metadata.fields).toEqual([])
  })

  it('governs global value set lifecycle and prevents deletion while fields use it', () => {
    const model = createModel()
    const valueSet = addGlobalValueSet(
      model.blueprint,
      model.solutionId,
      {
        label: 'Loan Status',
        apiName: '',
        description: 'Shared loan lifecycle values.',
        sorted: false,
        values: ['Draft', 'Active'],
        defaultValue: 'Draft',
      },
      model.options,
    )
    const status = addField(
      valueSet.blueprint,
      model.solutionId,
      {
        objectId: model.facilityId,
        label: 'Status',
        apiName: '',
        dataType: 'picklist',
        description: '',
        helpText: '',
        required: false,
        defaultValue: '',
        formula: '',
        referenceToObjectId: '',
        picklistValues: [],
        globalValueSetId: valueSet.globalValueSetId,
      },
      model.options,
    )
    expect(
      getGlobalValueSetDeleteDependencies(
        status.blueprint,
        model.solutionId,
        valueSet.globalValueSetId,
      ),
    ).toEqual(['Field: Facility.Status'])
    expect(() =>
      deleteGlobalValueSet(
        status.blueprint,
        model.solutionId,
        valueSet.globalValueSetId,
        model.options,
      ),
    ).toThrow('Move connected fields')

    const updated = updateGlobalValueSet(
      status.blueprint,
      model.solutionId,
      valueSet.globalValueSetId,
      {
        label: 'Loan Lifecycle',
        apiName: 'Loan_Lifecycle',
        description: '',
        sorted: true,
        values: ['Draft', 'Active', 'Closed'],
        defaultValue: 'Draft',
      },
      model.options,
    )
    expect(updated.solutions[0]?.versions[0]?.metadata.globalValueSets[0]).toMatchObject({
      label: 'Loan Lifecycle',
      sorted: true,
    })
  })

  it('stores dependent picklist mappings and protects controlling fields and values', () => {
    const model = createModel()
    const controller = addField(
      model.blueprint,
      model.solutionId,
      {
        objectId: model.facilityId,
        label: 'Status',
        apiName: '',
        dataType: 'picklist',
        description: '',
        helpText: '',
        required: false,
        defaultValue: '',
        formula: '',
        referenceToObjectId: '',
        picklistValues: ['Draft', 'Active'],
      },
      model.options,
    )
    const dependent = addField(
      controller.blueprint,
      model.solutionId,
      {
        objectId: model.facilityId,
        label: 'Substatus',
        apiName: '',
        dataType: 'picklist',
        description: '',
        helpText: '',
        required: false,
        defaultValue: '',
        formula: '',
        referenceToObjectId: '',
        picklistValues: ['Preparation', 'Operational'],
        controllingFieldId: controller.fieldId,
        dependencyMappings: [
          { controllingValue: 'Draft', dependentValues: ['Preparation'] },
          { controllingValue: 'Active', dependentValues: ['Operational'] },
        ],
      },
      model.options,
    )
    expect(
      dependent.blueprint.solutions[0]?.versions[0]?.metadata.fields.find(
        (field) => field.id === dependent.fieldId,
      )?.picklistDependency,
    ).toMatchObject({ controllingFieldId: controller.fieldId })
    expect(
      getFieldDeleteDependencies(dependent.blueprint, model.solutionId, controller.fieldId),
    ).toEqual(['Dependent field: Substatus'])
    expect(() =>
      updateField(
        dependent.blueprint,
        model.solutionId,
        controller.fieldId,
        {
          label: 'Status',
          apiName: 'Status__c',
          dataType: 'picklist',
          description: '',
          helpText: '',
          required: false,
          defaultValue: '',
          formula: '',
          referenceToObjectId: '',
          picklistValues: ['Draft'],
        },
        model.options,
      ),
    ).toThrow('Update dependent value mappings')
  })
})
