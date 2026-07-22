import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBlueprint } from '../domain/blueprintFactory'
import { projectRepository, workspacePreferenceRepository } from '../persistence/database'
import { useWorkspaceStore } from './workspaceStore'

vi.mock('../persistence/database', () => ({
  projectRepository: {
    list: vi.fn(),
    load: vi.fn(),
    loadMostRecent: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  },
  workspacePreferenceRepository: {
    loadLastOpenedProjectId: vi.fn(),
    saveLastOpenedProjectId: vi.fn(),
    clearLastOpenedProjectId: vi.fn(),
  },
}))

describe('workspaceStore persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(projectRepository.list).mockResolvedValue([])
    vi.mocked(workspacePreferenceRepository.loadLastOpenedProjectId).mockReturnValue(null)
    useWorkspaceStore.setState({
      status: 'idle',
      blueprint: null,
      projects: [],
      selectedSolutionId: null,
      selectedObjectId: null,
      selectedArtifactId: null,
      activeView: 'overview',
      metadataSection: 'objects',
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

  it('restores and switches to an explicitly selected local project', async () => {
    const first = createBlueprint({ name: 'First Project', description: '', clouds: [] })
    const second = createBlueprint({ name: 'Second Project', description: '', clouds: [] })
    vi.mocked(projectRepository.list).mockResolvedValue([
      { project: first.project, solutionCount: 0, objectCount: 0, fieldCount: 0 },
      { project: second.project, solutionCount: 0, objectCount: 0, fieldCount: 0 },
    ])
    vi.mocked(projectRepository.load).mockImplementation((projectId) =>
      Promise.resolve(projectId === second.project.id ? second : first),
    )
    vi.mocked(workspacePreferenceRepository.loadLastOpenedProjectId).mockReturnValue(
      second.project.id,
    )

    await useWorkspaceStore.getState().hydrate()
    expect(useWorkspaceStore.getState().blueprint?.project.name).toBe('Second Project')

    await useWorkspaceStore.getState().openProject(first.project.id)
    expect(useWorkspaceStore.getState()).toMatchObject({
      status: 'ready',
      activeView: 'overview',
      blueprint: { project: { name: 'First Project' } },
    })
    expect(workspacePreferenceRepository.saveLastOpenedProjectId).toHaveBeenLastCalledWith(
      first.project.id,
    )
  })

  it('deletes another project without closing the active project', async () => {
    const current = createBlueprint({ name: 'Current Project', description: '', clouds: [] })
    const other = createBlueprint({ name: 'Old Project', description: '', clouds: [] })
    vi.mocked(projectRepository.delete).mockResolvedValue()
    vi.mocked(projectRepository.list).mockResolvedValue([
      { project: current.project, solutionCount: 0, objectCount: 0, fieldCount: 0 },
    ])
    useWorkspaceStore.setState({
      blueprint: current,
      projects: [
        { project: current.project, solutionCount: 0, objectCount: 0, fieldCount: 0 },
        { project: other.project, solutionCount: 0, objectCount: 0, fieldCount: 0 },
      ],
      activeView: 'overview',
      status: 'ready',
    })

    await useWorkspaceStore.getState().deleteProject(other.project.id)

    expect(projectRepository.delete).toHaveBeenCalledWith(other.project.id)
    expect(useWorkspaceStore.getState()).toMatchObject({
      status: 'ready',
      activeView: 'overview',
      blueprint: { project: { id: current.project.id, name: 'Current Project' } },
      projects: [{ project: { id: current.project.id } }],
    })
    expect(workspacePreferenceRepository.clearLastOpenedProjectId).not.toHaveBeenCalled()
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

  it('opens the object workspace with a relationship field selected', () => {
    useWorkspaceStore.getState().openField('facility-object-id', 'borrower-field-id')

    expect(useWorkspaceStore.getState()).toMatchObject({
      activeView: 'metadata',
      metadataSection: 'objects',
      selectedObjectId: 'facility-object-id',
      selectedArtifactId: 'borrower-field-id',
    })
  })

  it('persists discovery notes in the selected solution version', async () => {
    vi.mocked(projectRepository.save).mockResolvedValue()
    await useWorkspaceStore.getState().createProject({
      name: 'Discovery Project',
      description: '',
      clouds: [],
    })
    await useWorkspaceStore.getState().createSolution({
      name: 'Workshop Design',
      description: '',
    })

    await useWorkspaceStore
      .getState()
      .updateDiscovery('<h2>Problem</h2><p>Capture the current process.</p>')

    expect(
      useWorkspaceStore.getState().blueprint?.solutions[0]?.versions[0]?.discovery,
    ).toMatchObject({
      format: 'html',
      content: '<h2>Problem</h2><p>Capture the current process.</p>',
    })
    expect(projectRepository.save).toHaveBeenCalledTimes(3)
  })

  it('persists field edits, duplication, and deletion', async () => {
    vi.mocked(projectRepository.save).mockResolvedValue()
    await useWorkspaceStore.getState().createProject({
      name: 'Field Operations',
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
      description: '',
      helpText: '',
      required: false,
      defaultValue: '',
      precision: 18,
      scale: 2,
      formula: '',
      referenceToObjectId: '',
      picklistValues: [],
    })

    const originalFieldId = useWorkspaceStore.getState().selectedArtifactId
    expect(originalFieldId).not.toBeNull()
    if (!originalFieldId) return

    await useWorkspaceStore.getState().updateField(originalFieldId, {
      label: 'Total Commitment',
      apiName: 'Total_Commitment__c',
      dataType: 'currency',
      description: 'Maximum committed facility amount',
      helpText: '',
      required: true,
      defaultValue: '',
      precision: 18,
      scale: 2,
      formula: '',
      referenceToObjectId: '',
      picklistValues: [],
    })
    await useWorkspaceStore.getState().duplicateField(originalFieldId)
    const duplicatedFieldId = useWorkspaceStore.getState().selectedArtifactId
    await useWorkspaceStore.getState().deleteField(originalFieldId)

    const state = useWorkspaceStore.getState()
    const fields = state.blueprint?.solutions[0]?.versions[0]?.metadata.fields
    expect(state.status).toBe('ready')
    expect(state.selectedArtifactId).toBe(state.selectedObjectId)
    expect(fields).toHaveLength(1)
    expect(fields?.[0]).toMatchObject({
      id: duplicatedFieldId,
      label: 'Total Commitment Copy',
      apiName: 'Total_Commitment_Copy__c',
      required: true,
    })
    expect(projectRepository.save).toHaveBeenCalledTimes(7)
  })

  it('persists project, solution, and object lifecycle operations', async () => {
    vi.mocked(projectRepository.save).mockResolvedValue()
    vi.mocked(projectRepository.delete).mockResolvedValue()
    await useWorkspaceStore.getState().createProject({
      name: 'Lifecycle Project',
      description: '',
      clouds: [],
    })
    await useWorkspaceStore.getState().updateProject({
      name: 'Lifecycle Project Updated',
      description: 'Current project details',
      clouds: ['Sales Cloud'],
    })
    await useWorkspaceStore.getState().createSolution({ name: 'Core Model', description: '' })
    const originalSolutionId = useWorkspaceStore.getState().selectedSolutionId
    expect(originalSolutionId).not.toBeNull()
    if (!originalSolutionId) return
    await useWorkspaceStore
      .getState()
      .updateSolution(originalSolutionId, { name: 'Core Model Updated', description: 'Details' })
    await useWorkspaceStore.getState().createObject({
      label: 'Facility',
      pluralLabel: 'Facilities',
      apiName: '',
      kind: 'custom',
      description: '',
    })
    const objectId = useWorkspaceStore.getState().selectedObjectId
    expect(objectId).not.toBeNull()
    if (!objectId) return
    await useWorkspaceStore.getState().updateObject(objectId, {
      label: 'Credit Facility',
      pluralLabel: 'Credit Facilities',
      apiName: 'Credit_Facility__c',
      kind: 'custom',
      description: 'Updated object details',
    })
    await useWorkspaceStore.getState().deleteObject(objectId)
    await useWorkspaceStore.getState().duplicateSolution(originalSolutionId)
    const duplicateId = useWorkspaceStore.getState().selectedSolutionId
    expect(duplicateId).not.toBe(originalSolutionId)
    await useWorkspaceStore.getState().setSolutionArchived(originalSolutionId, true)
    await useWorkspaceStore.getState().deleteSolution(originalSolutionId)

    let state = useWorkspaceStore.getState()
    expect(state.blueprint?.project).toMatchObject({
      name: 'Lifecycle Project Updated',
      description: 'Current project details',
    })
    expect(state.blueprint?.solutions).toHaveLength(1)
    expect(state.blueprint?.solutions[0]).toMatchObject({
      id: duplicateId,
      name: 'Core Model Updated Copy',
    })

    await useWorkspaceStore.getState().deleteProject()
    state = useWorkspaceStore.getState()
    expect(projectRepository.delete).toHaveBeenCalledOnce()
    expect(state).toMatchObject({
      blueprint: null,
      selectedSolutionId: null,
      selectedObjectId: null,
      selectedArtifactId: null,
      status: 'ready',
    })
  })
})
