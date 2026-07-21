import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SalesforceField } from '../../domain/blueprint'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { DeleteFieldDialog } from './DeleteFieldDialog'

const field: SalesforceField = {
  id: 'risk-rating-id',
  objectId: 'facility-id',
  origin: { type: 'created' },
  label: 'Risk Rating',
  apiName: 'Risk_Rating__c',
  dataType: 'picklist',
  required: false,
  localPicklistValues: [],
  governance: { tags: [] },
}

describe('DeleteFieldDialog', () => {
  it('explains dependencies instead of offering a destructive action', () => {
    useWorkspaceStore.setState({ status: 'ready', errorMessage: null })

    render(
      <DeleteFieldDialog
        field={field}
        dependencies={['Layout: Facility Record Page', 'Requirement: Capture lending risk']}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Layout: Facility Record Page', { exact: false })).toBeInTheDocument()
    expect(
      screen.getByText('Requirement: Capture lending risk', { exact: false }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete field' })).not.toBeInTheDocument()
  })

  it('requires confirmation before deleting an unreferenced field', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    useWorkspaceStore.setState({ status: 'ready', errorMessage: null })

    render(
      <DeleteFieldDialog field={field} dependencies={[]} onConfirm={onConfirm} onClose={onClose} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete field' }))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledOnce()
      expect(onClose).toHaveBeenCalledOnce()
    })
  })
})
