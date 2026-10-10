export const RESOURCE_TYPES = ['video', 'articulo', 'repo', 'curso', 'herramienta', 'otro'] as const
export type ResourceType = (typeof RESOURCE_TYPES)[number]

export const RESOURCE_STATUSES = ['inbox', 'reading', 'archived'] as const
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number]

/**
 * Estado del enriquecimiento con el scraper.
 * Ausente = enriquecido (o no hace falta).
 */
export type EnrichStatus = 'pending' | 'failed'

export interface Resource {
  id: string
  url: string
  title: string
  summary: string
  imageUrl?: string
  type: ResourceType
  tags: string[]
  status: ResourceStatus // UI: Inbox / En Estudio / Archivo
  createdAt: string // ISO
  updatedAt: string // ISO — resuelve conflictos al sincronizar (gana el más reciente)
  lastVisitedAt?: string
  deletedAt?: string // ISO — borrado lógico, para propagar eliminaciones entre dispositivos
  enrichStatus?: EnrichStatus
}

/** Respuesta de `GET /api/scrape`. */
export interface ScrapeResult {
  url: string
  title: string
  summary: string
  imageUrl?: string
  siteName?: string
  type: ResourceType
  tags: string[]
  /** true cuando el sitio bloqueó o falló y los datos se dedujeron solo de la URL. */
  fallback: boolean
}
