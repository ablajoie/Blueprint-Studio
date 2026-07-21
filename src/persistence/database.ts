import Dexie, { type EntityTable } from 'dexie'
import type { BlueprintFile } from '../domain/blueprint'

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
}
