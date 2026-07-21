import { fireEvent, render, screen } from '@testing-library/react'
import { createBlueprint } from '../../domain/blueprintFactory'
import { summarizeProject } from '../../domain/projectSummary'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { ProjectLibrary } from './ProjectLibrary'

describe('ProjectLibrary', () => {
  it('shows local projects and opens a selected project', () => {
    const current = createBlueprint({ name: 'Commercial Lending', description: '', clouds: [] })
    const other = createBlueprint({
      name: 'Customer Service',
      description: 'Service Cloud modernization',
      clouds: ['Service Cloud'],
    })
    const openProject = vi.fn().mockResolvedValue(undefined)
    useWorkspaceStore.setState({
      status: 'ready',
      blueprint: current,
      projects: [summarizeProject(current), summarizeProject(other)],
      selectedSolutionId: null,
      selectedObjectId: null,
      selectedArtifactId: null,
      activeView: 'projects',
      errorMessage: null,
      refreshProjects: vi.fn().mockResolvedValue(undefined),
      openProject,
    })

    render(<ProjectLibrary onCreateProject={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Commercial Lending' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Customer Service' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open project' }))
    expect(openProject).toHaveBeenCalledWith(other.project.id)
  })

  it('encourages creation when the local library is empty', () => {
    const onCreateProject = vi.fn()
    useWorkspaceStore.setState({
      status: 'ready',
      blueprint: null,
      projects: [],
      activeView: 'projects',
      errorMessage: null,
      refreshProjects: vi.fn().mockResolvedValue(undefined),
    })

    render(<ProjectLibrary onCreateProject={onCreateProject} />)
    expect(
      screen.getByRole('heading', { name: 'Let’s create your first project' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'New Project' }))
    expect(onCreateProject).toHaveBeenCalledOnce()
  })
})
