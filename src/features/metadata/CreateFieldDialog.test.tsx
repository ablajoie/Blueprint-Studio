import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SalesforceField, SalesforceObject } from '../../domain/blueprint'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { CreateFieldDialog, FieldDialog } from './CreateFieldDialog'

const facility: SalesforceObject = {
  id: 'facility-id',
  origin: { type: 'created' },
  label: 'Facility',
  pluralLabel: 'Facilities',
  apiName: 'Facility__c',
  kind: 'custom',
  governance: { tags: [] },
}

const commitmentAmount: SalesforceField = {
  id: 'commitment-amount-id',
  objectId: facility.id,
  origin: { type: 'created' },
  label: 'Commitment Amount',
  apiName: 'Commitment_Amount__c',
  dataType: 'currency',
  description: 'Original description',
  required: false,
  precision: 18,
  scale: 2,
  governance: { tags: [] },
}

describe('CreateFieldDialog', () => {
  it('collects picklist values and generates a Salesforce API name', async () => {
    const createField = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    useWorkspaceStore.setState({
      status: 'ready',
      errorMessage: null,
      createField,
    })

    render(<CreateFieldDialog object={facility} availableObjects={[facility]} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Field label'), {
      target: { value: 'Risk Rating' },
    })
    fireEvent.change(screen.getByLabelText('Data type'), {
      target: { value: 'picklist' },
    })
    fireEvent.change(screen.getByLabelText(/Picklist values/), {
      target: { value: 'Low\nMedium\nHigh' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create field' }))

    await waitFor(() => {
      expect(createField).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Risk Rating',
          apiName: 'Risk_Rating__c',
          dataType: 'picklist',
          picklistValues: ['Low', 'Medium', 'High'],
        }),
      )
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('loads and saves an existing field without changing its identity', async () => {
    const updateField = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    useWorkspaceStore.setState({
      status: 'ready',
      errorMessage: null,
      updateField,
    })

    render(
      <FieldDialog
        object={facility}
        availableObjects={[facility]}
        field={commitmentAmount}
        onClose={onClose}
      />,
    )

    expect(screen.getByLabelText('Field label')).toHaveValue('Commitment Amount')
    expect(screen.getByLabelText(/API name/)).toHaveValue('Commitment_Amount__c')
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'Maximum committed facility amount' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateField).toHaveBeenCalledWith(
        commitmentAmount.id,
        expect.objectContaining({
          label: 'Commitment Amount',
          apiName: 'Commitment_Amount__c',
          dataType: 'currency',
          description: 'Maximum committed facility amount',
          precision: 18,
          scale: 2,
        }),
      )
    })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
