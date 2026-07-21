import { create } from 'zustand'
import type { BlueprintFile } from '../domain/blueprint'
import {
  addObject,
  addSolution,
  createBlueprint,
  type NewObjectInput,
  type NewProjectInput,
  type NewSolutionInput,
} from '../domain/blueprintFactory'
import { projectRepository } from '../persistence/database'

export type WorkspaceView = 'overview' | 'start' | 'metadata'

interface WorkspaceState {
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'error'
  blueprint: BlueprintFile | null
  selectedSolutionId: string | null
  selectedArtifactId: string | null
  activeView: WorkspaceView
  errorMessage: string | null
  hydrate: () => Promise<void>
  createProject: (input: NewProjectInput) => Promise<void>
  createSolution: (input: NewSolutionInput) => Promise<void>
  createObject: (input: NewObjectInput) => Promise<void>
  openView: (view: WorkspaceView) => void
  selectSolution: (id: string) => void
  selectArtifact: (id: string | null) => void
  clearError: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  status: 'idle',
  blueprint: null,
  selectedSolutionId: null,
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
        selectedArtifactId: result.objectId,
        activeView: 'metadata',
        status: 'ready',
      })
    } catch {
      set({ status: 'error', errorMessage: 'Your object could not be saved. Please try again.' })
    }
  },
  openView: (activeView) => {
    set({ activeView })
  },
  selectSolution: (selectedSolutionId) => {
    set({ selectedSolutionId, selectedArtifactId: null, activeView: 'overview' })
  },
  selectArtifact: (selectedArtifactId) => {
    set({ selectedArtifactId })
  },
  clearError: () => {
    set({ errorMessage: null, status: 'ready' })
  },
}))
