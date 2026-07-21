import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SalesforceObject } from '../../domain/blueprint'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { CreateFieldDialog } from './CreateFieldDialog'

const facility: SalesforceObject = {
  id: 'facility-id',
  origin: { type: 'created' },
  label: 'Facility',
  pluralLabel: 'Facilities',
  apiName: 'Facility__c',
  kind: 'custom',
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
})
