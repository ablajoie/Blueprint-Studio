import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'
import { addField, addObject, addSolution, createBlueprint } from '../domain/blueprintFactory'
import { summarizeProject } from '../domain/projectSummary'
import { useWorkspaceStore } from '../store/workspaceStore'

describe('App', () => {
  it('renders the application shell', () => {
    useWorkspaceStore.setState({
      status: 'ready',
      blueprint: null,
      projects: [],
      selectedSolutionId: null,
      selectedObjectId: null,
      selectedArtifactId: null,
      activeView: 'overview',
      errorMessage: null,
      refreshProjects: vi.fn().mockResolvedValue(undefined),
    })
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument()
    expect(screen.getByLabelText('Solution Explorer')).toBeInTheDocument()
    expect(screen.queryByLabelText('Inspector')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Project' })).toBeEnabled()
  })

  it('opens the inspector for selected metadata and lets the user close it', () => {
    const project = createBlueprint({ name: 'Lending', description: '', clouds: [] })
    const solution = addSolution(project, { name: 'Core Model', description: '' })
    const object = addObject(solution.blueprint, solution.solutionId, {
      label: 'Facility',
      pluralLabel: 'Facilities',
      apiName: '',
      kind: 'custom',
      description: 'A commercial lending facility',
    })
    useWorkspaceStore.setState({
      status: 'ready',
      blueprint: object.blueprint,
      projects: [summarizeProject(object.blueprint)],
      selectedSolutionId: solution.solutionId,
      selectedObjectId: object.objectId,
      selectedArtifactId: object.objectId,
      activeView: 'metadata',
      errorMessage: null,
      refreshProjects: vi.fn().mockResolvedValue(undefined),
    })

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    const inspector = screen.getByLabelText('Inspector')
    expect(inspector).toBeInTheDocument()
    expect(within(inspector).getByRole('heading', { name: 'Facility' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close inspector' }))
    expect(screen.queryByLabelText('Inspector')).not.toBeInTheDocument()
  })

  it('selects a field when any part of its table row is clicked', () => {
    const project = createBlueprint({ name: 'Lending', description: '', clouds: [] })
    const solution = addSolution(project, { name: 'Core Model', description: '' })
    const object = addObject(solution.blueprint, solution.solutionId, {
      label: 'Facility',
      pluralLabel: 'Facilities',
      apiName: '',
      kind: 'custom',
      description: '',
    })
    const field = addField(object.blueprint, solution.solutionId, {
      objectId: object.objectId,
      label: 'Commitment Amount',
      apiName: 'Commitment_Amount__c',
      dataType: 'currency',
      description: 'Maximum committed amount',
      helpText: 'Enter the approved commitment.',
      required: false,
      defaultValue: '',
      precision: 18,
      scale: 2,
      formula: '',
      referenceToObjectId: '',
      picklistValues: [],
    })
    useWorkspaceStore.setState({
      status: 'ready',
      blueprint: field.blueprint,
      projects: [summarizeProject(field.blueprint)],
      selectedSolutionId: solution.solutionId,
      selectedObjectId: object.objectId,
      selectedArtifactId: null,
      activeView: 'metadata',
      errorMessage: null,
      refreshProjects: vi.fn().mockResolvedValue(undefined),
    })

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.queryByLabelText('Inspector')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Commitment_Amount__c'))
    const inspector = screen.getByLabelText('Inspector')
    expect(
      within(inspector).getByRole('heading', { name: 'Commitment Amount' }),
    ).toBeInTheDocument()
  })
})
