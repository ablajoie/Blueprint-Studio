import Dexie, { type EntityTable } from 'dexie'
import type { BlueprintFile } from '../domain/blueprint'
import { summarizeProject, type ProjectSummary } from '../domain/projectSummary'

export interface StoredProject {
  id: string
  name: string
  updatedAt: string
  payload: BlueprintFile
}

export const database = new Dexie('blueprint-studio') as Dexie & {
  projects: EntityTable<StoredProject, 'id'>
}

database.version(1).stores({ projects: 'id, name, updatedAt' })

export const projectRepository = {
  list: async (): Promise<ProjectSummary[]> => {
    const storedProjects = await database.projects.orderBy('updatedAt').reverse().toArray()
    return storedProjects.map((stored) => summarizeProject(stored.payload))
  },

  load: async (projectId: string): Promise<BlueprintFile | null> => {
    const stored = await database.projects.get(projectId)
    return stored?.payload ?? null
  },

  loadMostRecent: async (): Promise<BlueprintFile | null> => {
    const stored = await database.projects.orderBy('updatedAt').last()
    return stored?.payload ?? null
  },

  save: async (blueprint: BlueprintFile): Promise<void> => {
    await database.projects.put({
      id: blueprint.project.id,
      name: blueprint.project.name,
      updatedAt: blueprint.project.updatedAt,
      payload: blueprint,
    })
  },

  delete: async (projectId: string): Promise<void> => {
    await database.projects.delete(projectId)
  },
}

const lastOpenedProjectKey = 'blueprint-studio:last-opened-project'

export const workspacePreferenceRepository = {
  loadLastOpenedProjectId: (): string | null => {
    if (typeof localStorage === 'undefined') return null
    try {
      return localStorage.getItem(lastOpenedProjectKey)
    } catch {
      return null
    }
  },

  saveLastOpenedProjectId: (projectId: string): void => {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(lastOpenedProjectKey, projectId)
    } catch {
      // The project remains available in IndexedDB if preference storage is unavailable.
    }
  },

  clearLastOpenedProjectId: (): void => {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(lastOpenedProjectKey)
    } catch {
      // Preference cleanup must not block project lifecycle operations.
    }
  },
}
