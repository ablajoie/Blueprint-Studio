import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBlueprint } from '../domain/blueprintFactory'
import { projectRepository } from '../persistence/database'
import { useWorkspaceStore } from './workspaceStore'

vi.mock('../persistence/database', () => ({
  projectRepository: {
    loadMostRecent: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
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
