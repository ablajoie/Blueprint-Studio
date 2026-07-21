import Dexie, { type EntityTable } from 'dexie'

export interface StoredProject {
  id: string
  name: string
  updatedAt: string
  payload: unknown
}

export const database = new Dexie('blueprint-studio') as Dexie & {
  projects: EntityTable<StoredProject, 'id'>
}

database.version(1).stores({ projects: 'id, name, updatedAt' })
