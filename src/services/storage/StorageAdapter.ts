import type { Resource, ResourceStatus } from '../../types/resource.ts'

export type StatusCounts = Record<ResourceStatus, number>
export type Unsubscribe = () => void
export type ResourceChanges = Partial<Omit<Resource, 'id' | 'updatedAt'>>

/**
 * Contrato de persistencia. La UI solo habla con esta interfaz, nunca con Dexie.
 * Todas las lecturas excluyen los recursos con `deletedAt`, salvo que se indique.
 */
export interface StorageAdapter {
  /** Emite los recursos de un estado (más recientes primero) y vuelve a emitir con cada cambio. */
  observeByStatus(status: ResourceStatus, onChange: (resources: Resource[]) => void, onError?: (error: unknown) => void): Unsubscribe
  observeCounts(onChange: (counts: StatusCounts) => void): Unsubscribe

  get(id: string): Promise<Resource | undefined>
  /** Incluye borrados: lo descartado no debe volver al reimportar. */
  findByUrl(url: string): Promise<Resource | undefined>
  /** Cuáles de estas URLs ya existen (incluidas las borradas). */
  existingUrls(urls: string[]): Promise<Set<string>>
  pendingEnrichment(): Promise<Resource[]>

  add(resource: Resource): Promise<void>
  bulkAdd(resources: Resource[]): Promise<void>
  /** Aplica cambios y actualiza `updatedAt`. Un campo con `undefined` se elimina. */
  update(id: string, changes: ResourceChanges): Promise<void>
  /** Borrado lógico (`deletedAt`). */
  remove(id: string): Promise<void>
  restore(id: string): Promise<void>
}
