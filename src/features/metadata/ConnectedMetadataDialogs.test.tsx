import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SalesforceObject } from '../../domain/blueprint'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { GlobalValueSetDialog } from './GlobalValueSetDialog'
import { RelationshipDialog } from './RelationshipDialog'

const account: SalesforceObject = {
  id: 'account-object-id',
  origin: { type: 'created' },
  label: 'Account',
  apiName: 'Account',
  kind: 'standard',
  governance: { tags: [] },
}

const facility: SalesforceObject = {
  id: 'facility-object-id',
  origin: { type: 'created' },
  label: 'Facility',
  apiName: 'Facility__c',
  kind: 'custom',
  governance: { tags: [] },
}

describe('connected metadata dialogs', () => {
  it('creates a relationship and its field definition together', async () => {
    const createRelationship = vi.fn().mockResolvedValue(undefined)
    useWorkspaceStore.setState({ status: 'ready', errorMessage: null, createRelationship })

    render(<RelationshipDialog objects={[account, facility]} fields={[]} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Child object'), { target: { value: facility.id } })
    fireEvent.change(screen.getByLabelText('Related object'), { target: { value: account.id } })
    fireEvent.change(screen.getByLabelText('Field label'), { target: { value: 'Borrower' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create relationship' }))

    await waitFor(() => {
      expect(createRelationship).toHaveBeenCalledWith(
        expect.objectContaining({
          childObjectId: facility.id,
          parentObjectId: account.id,
          fieldLabel: 'Borrower',
          fieldApiName: 'Borrower__c',
          relationshipName: 'Borrower',
          type: 'lookup',
        }),
      )
    })
  })

  it('creates a governed value set with a default value', async () => {
    const createGlobalValueSet = vi.fn().mockResolvedValue(undefined)
    useWorkspaceStore.setState({ status: 'ready', errorMessage: null, createGlobalValueSet })

    render(<GlobalValueSetDialog onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Loan Status' } })
    fireEvent.change(screen.getByLabelText(/Values/), {
      target: { value: 'Draft\nActive\nClosed' },
    })
    fireEvent.change(screen.getByLabelText(/Default value/), { target: { value: 'Draft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create value set' }))

    await waitFor(() => {
      expect(createGlobalValueSet).toHaveBeenCalledWith({
        label: 'Loan Status',
        apiName: 'Loan_Status',
        description: '',
        sorted: false,
        values: ['Draft', 'Active', 'Closed'],
        defaultValue: 'Draft',
      })
    })
  })
})
