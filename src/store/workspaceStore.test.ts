import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBlueprint } from '../domain/blueprintFactory'
import { projectRepository } from '../persistence/database'
import { useWorkspaceStore } from './workspaceStore'

vi.mock('../persistence/database', () => ({
  projectRepository: {
    loadMostRecent: vi.fn(),
    save: vi.fn(),
  },
}))

describe('workspaceStore persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useWorkspaceStore.setState({
      status: 'idle',
      blueprint: null,
      selectedSolutionId: null,
      selectedObjectId: null,
      selectedArtifactId: null,
      activeView: 'overview',
      errorMessage: null,
    })
  })

  it('saves a new project before making it active', async () => {
    vi.mocked(projectRepository.save).mockResolvedValue()

    await useWorkspaceStore.getState().createProject({
      name: 'Commercial Lending',
      description: 'A governed lending design',
      clouds: ['Financial Services Cloud'],
    })

    expect(projectRepository.save).toHaveBeenCalledOnce()
    expect(useWorkspaceStore.getState()).toMatchObject({
      status: 'ready',
      blueprint: { project: { name: 'Commercial Lending' } },
    })
  })

  it('restores the most recently saved project when the app opens', async () => {
    const blueprint = createBlueprint({ name: 'Restored Project', description: '', clouds: [] })
    vi.mocked(projectRepository.loadMostRecent).mockResolvedValue(blueprint)

    await useWorkspaceStore.getState().hydrate()

    expect(useWorkspaceStore.getState()).toMatchObject({
      status: 'ready',
      blueprint: { project: { id: blueprint.project.id, name: 'Restored Project' } },
    })
  })

  it('saves a field into the selected object', async () => {
    vi.mocked(projectRepository.save).mockResolvedValue()
    await useWorkspaceStore.getState().createProject({
      name: 'Field Design',
      description: '',
      clouds: [],
    })
    await useWorkspaceStore.getState().createSolution({ name: 'Core Model', description: '' })
    await useWorkspaceStore.getState().createObject({
      label: 'Facility',
      pluralLabel: 'Facilities',
      apiName: '',
      kind: 'custom',
      description: '',
    })
    await useWorkspaceStore.getState().createField({
      label: 'Commitment Amount',
      apiName: '',
      dataType: 'currency',
      description: 'Maximum committed facility amount',
      helpText: '',
      required: false,
      defaultValue: '',
      precision: 18,
      scale: 2,
      formula: '',
      referenceToObjectId: '',
      picklistValues: [],
    })

    const state = useWorkspaceStore.getState()
    expect(state.status).toBe('ready')
    expect(state.blueprint?.solutions[0]?.versions[0]?.metadata.fields[0]).toMatchObject({
      label: 'Commitment Amount',
      dataType: 'currency',
      precision: 18,
      scale: 2,
    })
    expect(projectRepository.save).toHaveBeenCalledTimes(4)
  })
})
