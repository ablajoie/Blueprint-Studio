import { create } from 'zustand'
import type { BlueprintFile } from '../domain/blueprint'
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
import { projectRepository } from '../persistence/database'

export type WorkspaceView = 'overview' | 'start' | 'metadata'

interface WorkspaceState {
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'error'
  blueprint: BlueprintFile | null
  selectedSolutionId: string | null
  selectedObjectId: string | null
  selectedArtifactId: string | null
  activeView: WorkspaceView
  errorMessage: string | null
  hydrate: () => Promise<void>
  createProject: (input: NewProjectInput) => Promise<void>
  updateProject: (input: NewProjectInput) => Promise<void>
  deleteProject: () => Promise<void>
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
  openView: (view: WorkspaceView) => void
  selectSolution: (id: string) => void
  openObject: (id: string) => void
  showObjectList: () => void
  selectArtifact: (id: string | null) => void
  clearError: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  status: 'idle',
  blueprint: null,
  selectedSolutionId: null,
  selectedObjectId: null,
  selectedArtifactId: null,
  activeView: 'overview',
  errorMessage: null,
  hydrate: async () => {
    set({ status: 'loading', errorMessage: null })
    try {
      const blueprint = await projectRepository.loadMostRecent()
      set({
        blueprint,
        selectedSolutionId: blueprint?.solutions[0]?.id ?? null,
        selectedObjectId: null,
        status: 'ready',
      })
    } catch {
      set({ status: 'error', errorMessage: 'Blueprint Studio could not load your local project.' })
    }
  },
  createProject: async (input) => {
    set({ status: 'saving', errorMessage: null })
    try {
      const blueprint = createBlueprint(input)
      await projectRepository.save(blueprint)
      set({
        blueprint,
        selectedSolutionId: null,
        selectedObjectId: null,
        selectedArtifactId: null,
        activeView: 'overview',
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
      set({ blueprint, status: 'ready' })
    } catch (error) {
      set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Your project could not be updated.',
      })
    }
  },
  deleteProject: async () => {
    const current = useWorkspaceStore.getState().blueprint
    if (!current) return
    set({ status: 'saving', errorMessage: null })
    try {
      await projectRepository.delete(current.project.id)
      set({
        blueprint: null,
        selectedSolutionId: null,
        selectedObjectId: null,
        selectedArtifactId: null,
        activeView: 'overview',
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
  openView: (activeView) => {
    set({ activeView })
  },
  selectSolution: (selectedSolutionId) => {
    set({
      selectedSolutionId,
      selectedObjectId: null,
      selectedArtifactId: null,
      activeView: 'overview',
    })
  },
  openObject: (selectedObjectId) => {
    set({ selectedObjectId, selectedArtifactId: selectedObjectId, activeView: 'metadata' })
  },
  showObjectList: () => {
    set({ selectedObjectId: null, selectedArtifactId: null, activeView: 'metadata' })
  },
  selectArtifact: (selectedArtifactId) => {
    set({ selectedArtifactId })
  },
  clearError: () => {
    set({ errorMessage: null, status: 'ready' })
  },
}))
