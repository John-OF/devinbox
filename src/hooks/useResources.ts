import { useEffect, useState, useSyncExternalStore } from 'react'
import { enrichment } from '../services/enrichment.ts'
import { storage, type StatusCounts } from '../services/storage/index.ts'
import type { Resource, ResourceStatus } from '../types/resource.ts'

/** Recursos de un estado, en vivo. `null` mientras carga la primera vez. */
export function useResourcesByStatus(status: ResourceStatus): Resource[] | null {
  const [state, setState] = useState<{ status: ResourceStatus; resources: Resource[] } | null>(null)

  useEffect(
    () =>
      storage.observeByStatus(
        status,
        (resources) => setState({ status, resources }),
        (error) => console.error('[storage]', error),
      ),
    [status],
  )

  // Al cambiar de pestaña no mostramos la lista de la anterior
  return state?.status === status ? state.resources : null
}

const EMPTY_COUNTS: StatusCounts = { inbox: 0, reading: 0, archived: 0 }

export function useStatusCounts(): StatusCounts {
  const [counts, setCounts] = useState(EMPTY_COUNTS)
  useEffect(() => storage.observeCounts(setCounts), [])
  return counts
}

export function useEnrichmentProgress() {
  return useSyncExternalStore(enrichment.subscribe, enrichment.getSnapshot)
}
