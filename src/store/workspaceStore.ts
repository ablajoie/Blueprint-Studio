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
  createSolution: (input: NewSolutionInput) => Promise<void>
  createObject: (input: NewObjectInput) => Promise<void>
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
