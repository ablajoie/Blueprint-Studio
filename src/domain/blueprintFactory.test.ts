import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import schema from '../../schemas/blueprint.schema.json'
import {
  addField,
  addObject,
  addSolution,
  createBlueprint,
  deleteField,
  duplicateField,
  generateApiName,
  getFieldDeleteDependencies,
  updateField,
} from './blueprintFactory'

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
    const objectResult = addObject(
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
    const result = addField(
      objectResult.blueprint,
      solution.solutionId,
      {
        objectId: objectResult.objectId,
        label: 'Risk Rating',
        apiName: '',
        dataType: 'picklist',
        description: 'Current assessment of lending risk',
        helpText: 'Choose the approved risk category.',
        required: true,
        defaultValue: '',
        formula: '',
        referenceToObjectId: '',
        picklistValues: ['Low', 'Medium', 'High'],
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
    expect(createdSolution?.versions[0]?.metadata.fields[0]).toMatchObject({
      label: 'Risk Rating',
      apiName: 'Risk_Rating__c',
      dataType: 'picklist',
      required: true,
      localPicklistValues: [
        { label: 'Low', active: true },
        { label: 'Medium', active: true },
        { label: 'High', active: true },
      ],
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

  it('creates a relationship artifact with a lookup field', () => {
    const project = createBlueprint(
      { name: 'Relationship Design', description: '', clouds: [] },
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
    const result = addField(
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

    expect(result.blueprint.solutions[0]?.versions[0]?.metadata.relationships[0]).toMatchObject({
      fieldId: result.fieldId,
      parentObjectId: account.objectId,
      childObjectId: facility.objectId,
      type: 'lookup',
    })
  })

  it('updates a field in place and reconciles its relationship artifact', () => {
    const project = createBlueprint(
      { name: 'Field Maintenance', description: '', clouds: [] },
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
    const fieldResult = addField(
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

    const updated = updateField(
      fieldResult.blueprint,
      solution.solutionId,
      fieldResult.fieldId,
      {
        label: 'Borrower Name',
        apiName: 'Borrower_Name__c',
        dataType: 'text',
        description: 'Business-facing borrower name',
        helpText: '',
        required: true,
        defaultValue: '',
        length: 120,
        formula: '',
        referenceToObjectId: '',
        picklistValues: [],
      },
      { createId, now },
    )
    const version = updated.solutions[0]?.versions[0]

    expect(version?.metadata.fields[0]).toMatchObject({
      id: fieldResult.fieldId,
      label: 'Borrower Name',
      apiName: 'Borrower_Name__c',
      dataType: 'text',
      length: 120,
      required: true,
    })
    expect(version?.metadata.fields[0]?.referenceToObjectId).toBeUndefined()
    expect(version?.metadata.relationships).toEqual([])
  })

  it('duplicates fields with unique Salesforce labels and API names', () => {
    const project = createBlueprint(
      { name: 'Field Duplication', description: '', clouds: [] },
      { createId, now },
    )
    const solution = addSolution(project, { name: 'Lending', description: '' }, { createId, now })
    const object = addObject(
      solution.blueprint,
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
    const field = addField(
      object.blueprint,
      solution.solutionId,
      {
        objectId: object.objectId,
        label: 'Risk Rating',
        apiName: '',
        dataType: 'picklist',
        description: 'Approved risk category',
        helpText: '',
        required: false,
        defaultValue: '',
        formula: '',
        referenceToObjectId: '',
        picklistValues: ['Low', 'Medium', 'High'],
      },
      { createId, now },
    )
    const firstCopy = duplicateField(field.blueprint, solution.solutionId, field.fieldId, {
      createId,
      now,
    })
    const secondCopy = duplicateField(firstCopy.blueprint, solution.solutionId, field.fieldId, {
      createId,
      now,
    })
    const fields = secondCopy.blueprint.solutions[0]?.versions[0]?.metadata.fields

    expect(fields?.map((item) => [item.label, item.apiName])).toEqual([
      ['Risk Rating', 'Risk_Rating__c'],
      ['Risk Rating Copy', 'Risk_Rating_Copy__c'],
      ['Risk Rating Copy 2', 'Risk_Rating_Copy_2__c'],
    ])
    expect(fields?.[1]?.localPicklistValues?.map((value) => value.label)).toEqual([
      'Low',
      'Medium',
      'High',
    ])
  })

  it('blocks connected field deletion and removes an unreferenced field safely', () => {
    const project = createBlueprint(
      { name: 'Safe Deletion', description: '', clouds: [] },
      { createId, now },
    )
    const solution = addSolution(project, { name: 'Lending', description: '' }, { createId, now })
    const object = addObject(
      solution.blueprint,
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
    const field = addField(
      object.blueprint,
      solution.solutionId,
      {
        objectId: object.objectId,
        label: 'Commitment Amount',
        apiName: '',
        dataType: 'currency',
        description: '',
        helpText: '',
        required: false,
        defaultValue: '',
        precision: 18,
        scale: 2,
        formula: '',
        referenceToObjectId: '',
        picklistValues: [],
      },
      { createId, now },
    )
    const version = field.blueprint.solutions[0]?.versions[0]
    expect(version).toBeDefined()
    version?.experience.layouts.push({
      id: createId(),
      objectId: object.objectId,
      name: 'Facility Record Page',
      kind: 'record-page',
      sections: [
        {
          id: createId(),
          label: 'General Information',
          layout: 'two-column',
          collapsible: false,
          items: [
            {
              id: createId(),
              type: 'field',
              artifactId: field.fieldId,
              column: 0,
              order: 0,
              behavior: 'edit',
            },
          ],
        },
      ],
    })

    expect(getFieldDeleteDependencies(field.blueprint, solution.solutionId, field.fieldId)).toEqual(
      ['Layout: Facility Record Page'],
    )
    expect(() => deleteField(field.blueprint, solution.solutionId, field.fieldId)).toThrow(
      'Remove this field from its linked artifacts before deleting it',
    )

    if (version) version.experience.layouts = []
    const deleted = deleteField(field.blueprint, solution.solutionId, field.fieldId, {
      createId,
      now,
    })
    expect(deleted.solutions[0]?.versions[0]?.metadata.fields).toEqual([])
  })
})
