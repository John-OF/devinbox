import { dexieAdapter } from './dexieAdapter.ts'
import type { StorageAdapter } from './StorageAdapter.ts'

/** Punto único de acceso a la persistencia. Cambiar de backend = cambiar esta línea. */
export const storage: StorageAdapter = dexieAdapter

export type { ResourceChanges, StatusCounts, StorageAdapter } from './StorageAdapter.ts'
