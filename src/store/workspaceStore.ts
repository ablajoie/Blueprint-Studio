import { create } from 'zustand'
import type { BlueprintFile } from '../domain/blueprint'
import {
  addGlobalValueSet,
  addRelationship,
  deleteGlobalValueSet as deleteGlobalValueSetFromBlueprint,
  deleteRelationship as deleteRelationshipFromBlueprint,
  type NewGlobalValueSetInput,
  type NewRelationshipInput,
  updateGlobalValueSet as updateGlobalValueSetInBlueprint,
  updateRelationship as updateRelationshipInBlueprint,
} from '../domain/connectedMetadata'
import type { ProjectSummary } from '../domain/projectSummary'
import {
  addField,
  addObject,
  addSolution,
  createBlueprint,
  deleteField as deleteFieldFromBlueprint,
  duplicateField as duplicateFieldInBlueprint,
  type NewFieldInput,
  type NewObjectInput,
  type NewProjectInput,
  type NewSolutionInput,
  updateField as updateFieldInBlueprint,
} from '../domain/blueprintFactory'
import {
  deleteObject as deleteObjectFromBlueprint,
  deleteSolution as deleteSolutionFromBlueprint,
  duplicateSolution as duplicateSolutionInBlueprint,
  setSolutionArchived as setSolutionArchivedInBlueprint,
  updateObject as updateObjectInBlueprint,
  updateProject as updateProjectInBlueprint,
  updateSolution as updateSolutionInBlueprint,
} from '../domain/blueprintLifecycle'
import { projectRepository, workspacePreferenceRepository } from '../persistence/database'

export type WorkspaceView = 'projects' | 'overview' | 'start' | 'metadata'
export type MetadataSection = 'objects' | 'relationships' | 'global-value-sets'

interface WorkspaceState {
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'error'
  blueprint: BlueprintFile | null
  projects: ProjectSummary[]
  selectedSolutionId: string | null
  selectedObjectId: string | null
  selectedArtifactId: string | null
  activeView: WorkspaceView
  metadataSection: MetadataSection
  errorMessage: string | null
  hydrate: () => Promise<void>
  refreshProjects: () => Promise<void>
  openProject: (projectId: string) => Promise<void>
  createProject: (input: NewProjectInput) => Promise<void>
  updateProject: (input: NewProjectInput) => Promise<void>
  updateStoredProject: (projectId: string, input: NewProjectInput) => Promise<void>
  deleteProject: (projectId?: string) => Promise<void>
  createSolution: (input: NewSolutionInput) => Promise<void>
  updateSolution: (solutionId: string, input: NewSolutionInput) => Promise<void>
  duplicateSolution: (solutionId: string) => Promise<void>
  setSolutionArchived: (solutionId: string, archived: boolean) => Promise<void>
  deleteSolution: (solutionId: string) => Promise<void>
  createObject: (input: NewObjectInput) => Promise<void>
  updateObject: (objectId: string, input: NewObjectInput) => Promise<void>
  deleteObject: (objectId: string) => Promise<void>
  createField: (input: Omit<NewFieldInput, 'objectId'>) => Promise<void>
  updateField: (fieldId: string, input: Omit<NewFieldInput, 'objectId'>) => Promise<void>
  duplicateField: (fieldId: string) => Promise<void>
  deleteField: (fieldId: string) => Promise<void>
  createRelationship: (input: NewRelationshipInput) => Promise<void>
  updateRelationship: (relationshipId: string, input: NewRelationshipInput) => Promise<void>
  deleteRelationship: (relationshipId: string) => Promise<void>
  createGlobalValueSet: (input: NewGlobalValueSetInput) => Promise<void>
  updateGlobalValueSet: (globalValueSetId: string, input: NewGlobalValueSetInput) => Promise<void>
  deleteGlobalValueSet: (globalValueSetId: string) => Promise<void>
  openView: (view: WorkspaceView) => void
  selectSolution: (id: string) => void
  openObject: (id: string) => void
  openField: (objectId: string, fieldId: string) => void
  showObjectList: () => void
  showRelationships: () => void
  showGlobalValueSets: () => void
  selectArtifact: (id: string | null) => void
  clearError: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  status: 'idle',
  blueprint: null,
  projects: [],
  selectedSolutionId: null,
  selectedObjectId: null,
  selectedArtifactId: null,
  activeView: 'overview',
  metadataSection: 'objects',
  errorMessage: null,
  hydrate: async () => {
    set({ status: 'loading', errorMessage: null })
    try {
      const projects = await projectRepository.list()
      const preferredProjectId = workspacePreferenceRepository.loadLastOpenedProjectId()
      const preferredProjectExists = projects.some(
        (summary) => summary.project.id === preferredProjectId,
      )
      let blueprint = preferredProjectExists
        ? await projectRepository.load(preferredProjectId ?? '')
        : null
      blueprint ??= await projectRepository.loadMostRecent()
      if (blueprint) workspacePreferenceRepository.saveLastOpenedProjectId(blueprint.project.id)
      else workspacePreferenceRepository.clearLastOpenedProjectId()
      set({
        blueprint,
        projects,
        selectedSolutionId: blueprint?.solutions[0]?.id ?? null,
        selectedObjectId: null,
        selectedArtifactId: null,
        activeView: blueprint ? 'overview' : 'projects',
        metadataSection: 'objects',
        status: 'ready',
      })
    } catch {
      set({ status: 'error', errorMessage: 'Blueprint Studio could not load your local project.' })
    }
  },
  refreshProjects: async () => {
    try {
      const projects = await projectRepository.list()
      set({ projects })
    } catch {
      set({ status: 'error', errorMessage: 'Your local project library could not be refreshed.' })
    }
  },
  openProject: async (projectId) => {
    set({ status: 'loading', errorMessage: null })
    try {
      const blueprint = await projectRepository.load(projectId)
      if (!blueprint) throw new Error('Project not found')
      workspacePreferenceRepository.saveLastOpenedProjectId(projectId)
      set({
        blueprint,
        selectedSolutionId: blueprint.solutions[0]?.id ?? null,
        selectedObjectId: null,
        selectedArtifactId: null,
        activeView: 'overview',
        metadataSection: 'objects',
        status: 'ready',
      })
    } catch {
      set({ status: 'error', errorMessage: 'The selected project could not be opened.' })
    }
  },
  createProject: async (input) => {
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = createBlueprint(input)
      await projectRepository.save(blueprint)
      const projects = await projectRepository.list()
      workspacePreferenceRepository.saveLastOpenedProjectId(blueprint.project.id)
      set({
        blueprint,
        projects,
        selectedSolutionId: null,
        selectedObjectId: null,
        selectedArtifactId: null,
        activeView: 'overview',
        metadataSection: 'objects',
        status: 'ready',
      })
    } catch {
      set({ status: 'error', errorMessage: 'Your project could not be saved. Please try again.' })
    }
  },
  updateProject: async (input) => {
    const current = useWorkspaceStore.getState().blueprint
    if (!current) return
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = updateProjectInBlueprint(current, input)
      await projectRepository.save(blueprint)
      const projects = await projectRepository.list()
      set({ blueprint, projects, status: 'ready' })
    } catch (error) {
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Your project could not be updated.',
      })
    }
  },
  updateStoredProject: async (projectId, input) => {
    const current = useWorkspaceStore.getState().blueprint
    set({ status: 'saving', errorMessage: null })
    try {
      const stored =
        current?.project.id === projectId ? current : await projectRepository.load(projectId)
      if (!stored) throw new Error('The selected project could not be found')
      const updated = updateProjectInBlueprint(stored, input)
      await projectRepository.save(updated)
      const projects = await projectRepository.list()
      set({
        blueprint: current?.project.id === projectId ? updated : current,
        projects,
        status: 'ready',
      })
    } catch (error) {
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Your project could not be updated.',
      })
    }
  },
  deleteProject: async (projectId) => {
    const state = useWorkspaceStore.getState()
    const current = state.blueprint
    const targetProjectId = projectId ?? current?.project.id
    if (!targetProjectId) return
    set({ status: 'saving', errorMessage: null })
    try {
      await projectRepository.delete(targetProjectId)
      const projects = await projectRepository.list()
      const deletingCurrentProject = current?.project.id === targetProjectId
      if (deletingCurrentProject) workspacePreferenceRepository.clearLastOpenedProjectId()
      set({
        blueprint: deletingCurrentProject ? null : current,
        projects,
        selectedSolutionId: deletingCurrentProject ? null : state.selectedSolutionId,
        selectedObjectId: deletingCurrentProject ? null : state.selectedObjectId,
        selectedArtifactId: deletingCurrentProject ? null : state.selectedArtifactId,
        activeView: deletingCurrentProject ? 'projects' : state.activeView,
        status: 'ready',
      })
    } catch {
      set({ status: 'error', errorMessage: 'Your local project could not be deleted.' })
    }
  },
  createSolution: async (input) => {
    const current = useWorkspaceStore.getState().blueprint
    if (!current) return
    set({ status: 'saving', errorMessage: null })
    try {
      const result = addSolution(current, input)
      await projectRepository.save(result.blueprint)
      set({
        blueprint: result.blueprint,
        selectedSolutionId: result.solutionId,
        selectedObjectId: null,
        selectedArtifactId: null,
        activeView: 'start',
        status: 'ready',
      })
    } catch {
      set({ status: 'error', errorMessage: 'Your solution could not be saved. Please try again.' })
    }
  },
  updateSolution: async (solutionId, input) => {
    const current = useWorkspaceStore.getState().blueprint
    if (!current) return
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = updateSolutionInBlueprint(current, solutionId, input)
      await projectRepository.save(blueprint)
      set({ blueprint, status: 'ready' })
    } catch (error) {
      set({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Your solution could not be updated.',
      })
    }
  },
  duplicateSolution: async (solutionId) => {
    const current = useWorkspaceStore.getState().blueprint
    if (!current) return
    set({ status: 'saving', errorMessage: null })
    try {
      const result = duplicateSolutionInBlueprint(current, solutionId)
      await projectRepository.save(result.blueprint)
      set({
        blueprint: result.blueprint,
        selectedSolutionId: result.solutionId,
        selectedObjectId: null,
        selectedArtifactId: null,
        activeView: 'start',
        status: 'ready',
      })
    } catch (error) {
      set({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Your solution could not be duplicated.',
      })
    }
  },
  setSolutionArchived: async (solutionId, archived) => {
    const current = useWorkspaceStore.getState().blueprint
    if (!current) return
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = setSolutionArchivedInBlueprint(current, solutionId, archived)
      await projectRepository.save(blueprint)
      set({ blueprint, status: 'ready' })
    } catch (error) {
      set({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'The solution status could not be changed.',
      })
    }
  },
  deleteSolution: async (solutionId) => {
    const current = useWorkspaceStore.getState().blueprint
    if (!current) return
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = deleteSolutionFromBlueprint(current, solutionId)
      await projectRepository.save(blueprint)
      const fallbackSolutionId = blueprint.solutions[0]?.id ?? null
      set({
        blueprint,
        selectedSolutionId: fallbackSolutionId,
        selectedObjectId: null,
        selectedArtifactId: null,
        activeView: 'overview',
        status: 'ready',
      })
    } catch (error) {
      set({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Your solution could not be deleted.',
      })
    }
  },
  createObject: async (input) => {
    const state = useWorkspaceStore.getState()
    if (!state.blueprint || !state.selectedSolutionId) return
    set({ status: 'saving', errorMessage: null })
    try {
      const result = addObject(state.blueprint, state.selectedSolutionId, input)
      await projectRepository.save(result.blueprint)
      set({
        blueprint: result.blueprint,
        selectedObjectId: result.objectId,
        selectedArtifactId: result.objectId,
        activeView: 'metadata',
        status: 'ready',
      })
    } catch {
      set({ status: 'error', errorMessage: 'Your object could not be saved. Please try again.' })
    }
  },
  updateObject: async (objectId, input) => {
    const state = useWorkspaceStore.getState()
    if (!state.blueprint || !state.selectedSolutionId) return
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = updateObjectInBlueprint(
        state.blueprint,
        state.selectedSolutionId,
        objectId,
        input,
      )
      await projectRepository.save(blueprint)
      set({ blueprint, selectedArtifactId: objectId, status: 'ready' })
    } catch (error) {
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Your object could not be updated.',
      })
    }
  },
  deleteObject: async (objectId) => {
    const state = useWorkspaceStore.getState()
    if (!state.blueprint || !state.selectedSolutionId) return
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = deleteObjectFromBlueprint(
        state.blueprint,
        state.selectedSolutionId,
        objectId,
      )
      await projectRepository.save(blueprint)
      set({
        blueprint,
        selectedObjectId: null,
        selectedArtifactId: null,
        activeView: 'metadata',
        status: 'ready',
      })
    } catch (error) {
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Your object could not be deleted.',
      })
    }
  },
  createField: async (input) => {
    const state = useWorkspaceStore.getState()
    if (!state.blueprint || !state.selectedSolutionId || !state.selectedObjectId) return
    set({ status: 'saving', errorMessage: null })
    try {
      const result = addField(state.blueprint, state.selectedSolutionId, {
        ...input,
        objectId: state.selectedObjectId,
      })
      await projectRepository.save(result.blueprint)
      set({
        blueprint: result.blueprint,
        selectedArtifactId: result.fieldId,
        activeView: 'metadata',
        status: 'ready',
      })
    } catch (error) {
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Your field could not be saved.',
      })
    }
  },
  updateField: async (fieldId, input) => {
    const state = useWorkspaceStore.getState()
    if (!state.blueprint || !state.selectedSolutionId) return
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = updateFieldInBlueprint(
        state.blueprint,
        state.selectedSolutionId,
        fieldId,
        input,
      )
      await projectRepository.save(blueprint)
      set({ blueprint, selectedArtifactId: fieldId, status: 'ready' })
    } catch (error) {
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Your field could not be updated.',
      })
    }
  },
  duplicateField: async (fieldId) => {
    const state = useWorkspaceStore.getState()
    if (!state.blueprint || !state.selectedSolutionId) return
    set({ status: 'saving', errorMessage: null })
    try {
      const result = duplicateFieldInBlueprint(state.blueprint, state.selectedSolutionId, fieldId)
      await projectRepository.save(result.blueprint)
      set({
        blueprint: result.blueprint,
        selectedArtifactId: result.fieldId,
        status: 'ready',
      })
    } catch (error) {
      set({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Your field could not be duplicated.',
      })
    }
  },
  deleteField: async (fieldId) => {
    const state = useWorkspaceStore.getState()
    if (!state.blueprint || !state.selectedSolutionId) return
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = deleteFieldFromBlueprint(state.blueprint, state.selectedSolutionId, fieldId)
      await projectRepository.save(blueprint)
      set({ blueprint, selectedArtifactId: state.selectedObjectId, status: 'ready' })
    } catch (error) {
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Your field could not be deleted.',
      })
    }
  },
  createRelationship: async (input) => {
    const state = useWorkspaceStore.getState()
    if (!state.blueprint || !state.selectedSolutionId) return
    set({ status: 'saving', errorMessage: null })
    try {
      const result = addRelationship(state.blueprint, state.selectedSolutionId, input)
      await projectRepository.save(result.blueprint)
      set({
        blueprint: result.blueprint,
        selectedObjectId: null,
        selectedArtifactId: result.relationshipId,
        metadataSection: 'relationships',
        activeView: 'metadata',
        status: 'ready',
      })
    } catch (error) {
      set({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Your relationship could not be saved.',
      })
    }
  },
  updateRelationship: async (relationshipId, input) => {
    const state = useWorkspaceStore.getState()
    if (!state.blueprint || !state.selectedSolutionId) return
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = updateRelationshipInBlueprint(
        state.blueprint,
        state.selectedSolutionId,
        relationshipId,
        input,
      )
      await projectRepository.save(blueprint)
      set({ blueprint, selectedArtifactId: relationshipId, status: 'ready' })
    } catch (error) {
      set({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Your relationship could not be updated.',
      })
    }
  },
  deleteRelationship: async (relationshipId) => {
    const state = useWorkspaceStore.getState()
    if (!state.blueprint || !state.selectedSolutionId) return
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = deleteRelationshipFromBlueprint(
        state.blueprint,
        state.selectedSolutionId,
        relationshipId,
      )
      await projectRepository.save(blueprint)
      set({ blueprint, selectedArtifactId: null, status: 'ready' })
    } catch (error) {
      set({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Your relationship could not be deleted.',
      })
    }
  },
  createGlobalValueSet: async (input) => {
    const state = useWorkspaceStore.getState()
    if (!state.blueprint || !state.selectedSolutionId) return
    set({ status: 'saving', errorMessage: null })
    try {
      const result = addGlobalValueSet(state.blueprint, state.selectedSolutionId, input)
      await projectRepository.save(result.blueprint)
      set({
        blueprint: result.blueprint,
        selectedObjectId: null,
        selectedArtifactId: result.globalValueSetId,
        metadataSection: 'global-value-sets',
        activeView: 'metadata',
        status: 'ready',
      })
    } catch (error) {
      set({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Your global value set could not be saved.',
      })
    }
  },
  updateGlobalValueSet: async (globalValueSetId, input) => {
    const state = useWorkspaceStore.getState()
    if (!state.blueprint || !state.selectedSolutionId) return
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = updateGlobalValueSetInBlueprint(
        state.blueprint,
        state.selectedSolutionId,
        globalValueSetId,
        input,
      )
      await projectRepository.save(blueprint)
      set({ blueprint, selectedArtifactId: globalValueSetId, status: 'ready' })
    } catch (error) {
      set({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Your global value set could not be updated.',
      })
    }
  },
  deleteGlobalValueSet: async (globalValueSetId) => {
    const state = useWorkspaceStore.getState()
    if (!state.blueprint || !state.selectedSolutionId) return
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = deleteGlobalValueSetFromBlueprint(
        state.blueprint,
        state.selectedSolutionId,
        globalValueSetId,
      )
      await projectRepository.save(blueprint)
      set({ blueprint, selectedArtifactId: null, status: 'ready' })
    } catch (error) {
      set({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Your global value set could not be deleted.',
      })
    }
  },
  openView: (activeView) => {
    set({ activeView })
  },
  selectSolution: (selectedSolutionId) => {
    set({
      selectedSolutionId,
      selectedObjectId: null,
      selectedArtifactId: null,
      activeView: 'overview',
      metadataSection: 'objects',
    })
  },
  openObject: (selectedObjectId) => {
    set({
      selectedObjectId,
      selectedArtifactId: selectedObjectId,
      metadataSection: 'objects',
      activeView: 'metadata',
    })
  },
  openField: (selectedObjectId, selectedArtifactId) => {
    set({
      selectedObjectId,
      selectedArtifactId,
      metadataSection: 'objects',
      activeView: 'metadata',
    })
  },
  showObjectList: () => {
    set({
      selectedObjectId: null,
      selectedArtifactId: null,
      metadataSection: 'objects',
      activeView: 'metadata',
    })
  },
  showRelationships: () => {
    set({
      selectedObjectId: null,
      selectedArtifactId: null,
      metadataSection: 'relationships',
      activeView: 'metadata',
    })
  },
  showGlobalValueSets: () => {
    set({
      selectedObjectId: null,
      selectedArtifactId: null,
      metadataSection: 'global-value-sets',
      activeView: 'metadata',
    })
  },
  selectArtifact: (selectedArtifactId) => {
    set({ selectedArtifactId })
  },
  clearError: () => {
    set({ errorMessage: null, status: 'ready' })
  },
}))
