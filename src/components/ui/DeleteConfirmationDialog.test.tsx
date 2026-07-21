import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'

describe('DeleteConfirmationDialog', () => {
  it('requires the exact project name for high-impact deletion', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(
      <DeleteConfirmationDialog
        title="Delete Commercial Lending?"
        description="This cannot be undone."
        itemName="Commercial Lending"
        blockers={[]}
        consequences={['2 solutions', '12 fields']}
        requireName
        confirmLabel="Delete project"
        busy={false}
        errorMessage={null}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    )

    const deleteButton = screen.getByRole('button', { name: 'Delete project' })
    expect(deleteButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Type “Commercial Lending” to confirm/), {
      target: { value: 'Commercial Lending' },
    })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledOnce()
    })
  })

  it('shows blockers without exposing a delete action', () => {
    render(
      <DeleteConfirmationDialog
        title="Delete Account?"
        description="Review dependencies."
        itemName="Account"
        blockers={['Relationship field: Borrower']}
        consequences={['10 fields']}
        confirmLabel="Delete object"
        busy={false}
        errorMessage={null}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Relationship field: Borrower', { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete object' })).not.toBeInTheDocument()
  })
})
