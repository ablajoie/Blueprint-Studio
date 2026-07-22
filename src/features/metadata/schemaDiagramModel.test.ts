import type { ObjectRelationship, SalesforceField, SalesforceObject } from '../../domain/blueprint'
import { createSchemaDiagramModel } from './schemaDiagramModel'

const objects: SalesforceObject[] = [
  objectDefinition('account', 'Account', 'standard'),
  objectDefinition('facility', 'Facility', 'custom'),
  objectDefinition('contact', 'Contact', 'standard'),
]

const fields: SalesforceField[] = [
  relationshipField('borrower-field', 'facility', 'Borrower', 'lookup', 'account'),
  relationshipField('contact-field', 'facility', 'Primary Contact', 'lookup', 'contact'),
]

const relationships: ObjectRelationship[] = [
  relationshipDefinition('borrower-relationship', 'borrower-field', 'facility', 'account'),
  relationshipDefinition('contact-relationship', 'contact-field', 'facility', 'contact'),
]

describe('schema diagram model', () => {
  it('places highly connected objects first and resolves relationship paths', () => {
    const model = createSchemaDiagramModel(objects, fields, relationships)

    expect(model.nodes).toHaveLength(3)
    expect(model.nodes[0]?.object.label).toBe('Facility')
    expect(model.nodes[0]).toMatchObject({ fieldCount: 2, relationshipCount: 2 })
    expect(model.edges).toHaveLength(2)
    expect(model.edges[0]).toMatchObject({
      field: { label: 'Borrower' },
      child: { label: 'Facility' },
      parent: { label: 'Account' },
    })
    expect(model.edges[0]?.path).toMatch(/^M /)
    expect(model.width).toBeGreaterThanOrEqual(760)
    expect(model.height).toBeGreaterThanOrEqual(430)
  })

  it('omits unresolved connections without breaking the canvas', () => {
    const unresolved = relationshipDefinition(
      'missing-relationship',
      'missing-field',
      'facility',
      'missing-object',
    )

    const model = createSchemaDiagramModel(objects, fields, [...relationships, unresolved])

    expect(model.edges).toHaveLength(2)
    expect(model.nodes.find((node) => node.object.id === 'facility')?.relationshipCount).toBe(3)
  })
})

function objectDefinition(
  id: string,
  label: string,
  kind: SalesforceObject['kind'],
): SalesforceObject {
  return {
    id,
    origin: { type: 'created' },
    label,
    apiName: kind === 'custom' ? `${label}__c` : label,
    kind,
    governance: { tags: [] },
  }
}

function relationshipField(
  id: string,
  objectId: string,
  label: string,
  dataType: SalesforceField['dataType'],
  referenceToObjectId: string,
): SalesforceField {
  return {
    id,
    objectId,
    origin: { type: 'created' },
    label,
    apiName: `${label.replaceAll(' ', '_')}__c`,
    dataType,
    required: false,
    referenceToObjectId,
    governance: { tags: [] },
  }
}

function relationshipDefinition(
  id: string,
  fieldId: string,
  childObjectId: string,
  parentObjectId: string,
): ObjectRelationship {
  return {
    id,
    fieldId,
    childObjectId,
    parentObjectId,
    type: 'lookup',
    relationshipName: 'Relationship',
  }
}
