import type { Resource, ResourceStatus, ResourceType } from '../types/resource.ts'
import { fallbackMetadata } from './classify.ts'
import { enrichment } from './enrichment.ts'
import { storage } from './storage/index.ts'
import { getDomain, normalizeUrl } from './url.ts'

export type CaptureResult =
  | { kind: 'created' | 'revived' | 'exists'; resource: Resource }
  | { kind: 'invalid' }

export interface LinkToImport {
  url: string
  /** Fecha original (p. ej. del mensaje de WhatsApp); por defecto, ahora. */
  date?: Date
}

function newId(): string {
  // randomUUID solo existe en contextos seguros (https / localhost)
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function newResource(url: string, createdAt: string): Resource {
  const base = fallbackMetadata(url)
  return {
    id: newId(),
    url,
    title: base.title,
    summary: '',
    type: base.type,
    tags: base.tags,
    status: 'inbox',
    createdAt,
    updatedAt: new Date().toISOString(),
    enrichStatus: 'pending',
  }
}

/**
 * Guarda una URL en el inbox al instante y la enriquece en segundo plano.
 * Si se había descartado antes, la recupera; si ya existe, no la duplica.
 */
export async function captureUrl(input: string): Promise<CaptureResult> {
  const url = normalizeUrl(input)
  if (!url) return { kind: 'invalid' }

  const existing = await storage.findByUrl(url)
  if (existing && !existing.deletedAt) return { kind: 'exists', resource: existing }

  const now = new Date().toISOString()
  if (existing) {
    await storage.update(existing.id, { deletedAt: undefined, status: 'inbox', createdAt: now })
    return { kind: 'revived', resource: { ...existing, deletedAt: undefined, status: 'inbox', createdAt: now } }
  }

  const resource = newResource(url, now)
  try {
    await storage.add(resource)
  } catch (error) {
    // Dos capturas simultáneas de la misma URL: el índice único gana
    const winner = await storage.findByUrl(url)
    if (winner) return { kind: 'exists', resource: winner }
    throw error
  }
  enrichment.enqueue([resource.id])
  return { kind: 'created', resource }
}

/** Separa links nuevos de los que ya existen (incluidos los descartados). */
export async function splitNewLinks(links: LinkToImport[]): Promise<{ fresh: LinkToImport[]; duplicates: number }> {
  const existing = await storage.existingUrls(links.map((link) => link.url))
  const fresh = links.filter((link) => !existing.has(link.url))
  return { fresh, duplicates: links.length - fresh.length }
}

/** Importación por lotes: guarda todo de golpe y deja el enriquecimiento en la cola. */
export async function importLinks(links: LinkToImport[]): Promise<number> {
  const { fresh } = await splitNewLinks(links)
  const resources = fresh.map((link) => newResource(link.url, (link.date ?? new Date()).toISOString()))
  await storage.bulkAdd(resources)
  enrichment.enqueue(resources.map((resource) => resource.id))
  return resources.length
}

export const setStatus = (id: string, status: ResourceStatus) => storage.update(id, { status })
export const removeResource = (id: string) => storage.remove(id)
export const restoreResource = (id: string) => storage.restore(id)
export const markVisited = (id: string) => storage.update(id, { lastVisitedAt: new Date().toISOString() })
export const retryEnrichment = (id: string) => enrichment.retry(id)

export function openResource(resource: Resource): void {
  // window.open primero, dentro del gesto del usuario, para que no lo bloqueen
  window.open(resource.url, '_blank', 'noopener,noreferrer')
  void markVisited(resource.id)
}

export interface ResourceFilters {
  type?: ResourceType
  search?: string
}

const searchIndex = new WeakMap<Resource, string>()

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function searchableText(resource: Resource): string {
  let text = searchIndex.get(resource)
  if (text === undefined) {
    text = normalizeText([resource.title, resource.summary, getDomain(resource.url), resource.url, resource.tags.join(' ')].join(' '))
    searchIndex.set(resource, text)
  }
  return text
}

export function filterResources(resources: Resource[], { type, search }: ResourceFilters): Resource[] {
  const terms = normalizeText(search ?? '').split(/\s+/).filter(Boolean)
  if (!type && terms.length === 0) return resources
  return resources.filter(
    (resource) => (!type || resource.type === type) && terms.every((term) => searchableText(resource).includes(term)),
  )
}
