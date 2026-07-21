import { create } from 'zustand'

interface WorkspaceState {
  selectedArtifactId: string | null
  selectArtifact: (id: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedArtifactId: null,
  selectArtifact: (selectedArtifactId) => {
    set({ selectedArtifactId })
  },
}))
