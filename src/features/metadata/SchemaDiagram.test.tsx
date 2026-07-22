import { fireEvent, render, screen } from '@testing-library/react'
import type { ObjectRelationship, SalesforceField, SalesforceObject } from '../../domain/blueprint'
import { SchemaDiagram } from './SchemaDiagram'

const account: SalesforceObject = {
  id: 'account',
  origin: { type: 'created' },
  label: 'Account',
  apiName: 'Account',
  kind: 'standard',
  governance: { tags: [] },
}

const facility: SalesforceObject = {
  id: 'facility',
  origin: { type: 'created' },
  label: 'Facility',
  apiName: 'Facility__c',
  kind: 'custom',
  governance: { tags: [] },
}

const borrowerField: SalesforceField = {
  id: 'borrower-field',
  objectId: facility.id,
  origin: { type: 'created' },
  label: 'Borrower',
  apiName: 'Borrower__c',
  dataType: 'lookup',
  required: false,
  referenceToObjectId: account.id,
  governance: { tags: [] },
}

const borrowerRelationship: ObjectRelationship = {
  id: 'borrower-relationship',
  fieldId: borrowerField.id,
  childObjectId: facility.id,
  parentObjectId: account.id,
  type: 'lookup',
  relationshipName: 'Borrower',
}

describe('SchemaDiagram', () => {
  it('opens object workspaces and relationship details from the diagram', () => {
    const onOpenObject = vi.fn()
    const onSelectRelationship = vi.fn()

    render(
      <SchemaDiagram
        objects={[account, facility]}
        fields={[borrowerField]}
        relationships={[borrowerRelationship]}
        selectedArtifactId={null}
        onOpenObject={onOpenObject}
        onSelectRelationship={onSelectRelationship}
      />,
    )

    expect(screen.getByLabelText('Data model diagram')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open Facility object' }))
    expect(onOpenObject).toHaveBeenCalledWith(facility.id)

    fireEvent.click(screen.getByRole('button', { name: 'Inspect Borrower relationship' }))
    expect(onSelectRelationship).toHaveBeenCalledWith(borrowerRelationship.id)
  })
})
