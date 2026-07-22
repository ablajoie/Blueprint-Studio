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
      metadataSection: 'objects',
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
      metadataSection: 'objects',
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
      metadataSection: 'objects',
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

  it('switches from the object table to a connected schema diagram', () => {
    const project = createBlueprint({ name: 'Lending', description: '', clouds: [] })
    const solution = addSolution(project, { name: 'Core Model', description: '' })
    const account = addObject(solution.blueprint, solution.solutionId, {
      label: 'Account',
      pluralLabel: 'Accounts',
      apiName: 'Account',
      kind: 'standard',
      description: '',
    })
    const facility = addObject(account.blueprint, solution.solutionId, {
      label: 'Facility',
      pluralLabel: 'Facilities',
      apiName: 'Facility__c',
      kind: 'custom',
      description: '',
    })
    const borrower = addField(facility.blueprint, solution.solutionId, {
      objectId: facility.objectId,
      label: 'Borrower',
      apiName: 'Borrower__c',
      dataType: 'lookup',
      description: '',
      helpText: '',
      required: false,
      defaultValue: '',
      formula: '',
      referenceToObjectId: account.objectId,
      picklistValues: [],
      relationshipName: 'Borrower',
      relationshipDescription: '',
    })
    useWorkspaceStore.setState({
      status: 'ready',
      blueprint: borrower.blueprint,
      projects: [summarizeProject(borrower.blueprint)],
      selectedSolutionId: solution.solutionId,
      selectedObjectId: null,
      selectedArtifactId: null,
      activeView: 'metadata',
      metadataSection: 'objects',
      errorMessage: null,
      refreshProjects: vi.fn().mockResolvedValue(undefined),
    })

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Diagram' }))
    expect(screen.getByLabelText('Data model diagram')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Borrower relationship' }))

    const inspector = screen.getByLabelText('Inspector')
    expect(within(inspector).getByRole('heading', { name: 'Borrower' })).toBeInTheDocument()
  })

  it('opens Discovery from the solution workspace', () => {
    const project = createBlueprint({ name: 'Lending', description: '', clouds: [] })
    const result = addSolution(project, { name: 'Core Model', description: '' })
    useWorkspaceStore.setState({
      status: 'ready',
      blueprint: result.blueprint,
      projects: [summarizeProject(result.blueprint)],
      selectedSolutionId: result.solutionId,
      selectedObjectId: null,
      selectedArtifactId: null,
      activeView: 'start',
      metadataSection: 'objects',
      errorMessage: null,
      refreshProjects: vi.fn().mockResolvedValue(undefined),
    })

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Start with Discovery Notes/ }))

    expect(screen.getByRole('heading', { name: 'Discovery' })).toBeInTheDocument()
    expect(screen.getByLabelText('Discovery notes editor')).toBeInTheDocument()
  })
})
