import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Project, SalesforceObject, Solution } from '../../domain/blueprint'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { ObjectDialog } from '../metadata/CreateObjectDialog'
import { ProjectDialog } from '../projects/CreateProjectDialog'
import { SolutionDialog } from '../solutions/CreateSolutionDialog'

const project: Project = {
  id: 'project-id',
  name: 'Commercial Lending',
  description: 'Original project details',
  clouds: ['Sales Cloud'],
  status: 'active',
  tags: [],
  createdAt: '2026-07-21T12:00:00.000Z',
  updatedAt: '2026-07-21T12:00:00.000Z',
}

const solution: Solution = {
  id: 'solution-id',
  projectId: project.id,
  name: 'Borrowing Structure',
  description: 'Original solution details',
  versions: [],
  createdAt: '2026-07-21T12:00:00.000Z',
  updatedAt: '2026-07-21T12:00:00.000Z',
}

const object: SalesforceObject = {
  id: 'object-id',
  origin: { type: 'created' },
  label: 'Facility',
  pluralLabel: 'Facilities',
  apiName: 'Facility__c',
  kind: 'custom',
  description: 'Original object details',
  governance: { tags: [] },
}

describe('lifecycle detail editors', () => {
  it('updates project details and cloud selections', async () => {
    const updateProject = vi.fn().mockResolvedValue(undefined)
    useWorkspaceStore.setState({ status: 'ready', errorMessage: null, updateProject })
    render(<ProjectDialog project={project} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Project name'), {
      target: { value: 'Commercial Lending Modernization' },
    })
    fireEvent.click(screen.getByLabelText('Data Cloud'))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateProject).toHaveBeenCalledWith({
        name: 'Commercial Lending Modernization',
        description: 'Original project details',
        clouds: ['Sales Cloud', 'Data Cloud'],
      })
    })
  })

  it('updates solution details', async () => {
    const updateSolution = vi.fn().mockResolvedValue(undefined)
    useWorkspaceStore.setState({ status: 'ready', errorMessage: null, updateSolution })
    render(<SolutionDialog solution={solution} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Description', { exact: false }), {
      target: { value: 'Updated solution details' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateSolution).toHaveBeenCalledWith(solution.id, {
        name: solution.name,
        description: 'Updated solution details',
      })
    })
  })

  it('updates object details while preserving the object ID', async () => {
    const updateObject = vi.fn().mockResolvedValue(undefined)
    useWorkspaceStore.setState({ status: 'ready', errorMessage: null, updateObject })
    render(<ObjectDialog object={object} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Credit Facility' } })
    fireEvent.change(screen.getByLabelText(/API name/), {
      target: { value: 'Credit_Facility__c' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateObject).toHaveBeenCalledWith(
        object.id,
        expect.objectContaining({
          label: 'Credit Facility',
          apiName: 'Credit_Facility__c',
          kind: 'custom',
        }),
      )
    })
  })
})
