import { scrapeMetadata } from './scrapeClient.ts'
import { storage, type ResourceChanges } from './storage/index.ts'

const CONCURRENCY = 4

export interface EnrichmentProgress {
  running: boolean
  done: number
  total: number
}

const IDLE: EnrichmentProgress = { running: false, done: 0, total: 0 }

/**
 * Cola en segundo plano que completa los recursos `pending` con el scraper.
 * Expone el progreso de la tanda actual para la barra de importación.
 */
class EnrichmentQueue {
  private queue: string[] = []
  private inFlight = new Set<string>()
  private active = 0
  private progress = IDLE
  private listeners = new Set<() => void>()

  enqueue(ids: string[]): void {
    const fresh = ids.filter((id) => !this.inFlight.has(id))
    if (fresh.length === 0) return
    for (const id of fresh) {
      this.inFlight.add(id)
      this.queue.push(id)
    }
    this.setProgress({ running: true, done: this.progress.done, total: this.progress.total + fresh.length })
    this.pump()
  }

  /** Retoma lo que quedó pendiente (p. ej. si se cerró la pestaña a mitad de una importación). */
  async resumePending(): Promise<void> {
    const pending = await storage.pendingEnrichment()
    this.enqueue(pending.map((resource) => resource.id))
  }

  async retry(id: string): Promise<void> {
    await storage.update(id, { enrichStatus: 'pending' })
    this.enqueue([id])
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): EnrichmentProgress => this.progress

  private setProgress(progress: EnrichmentProgress): void {
    this.progress = progress
    for (const listener of this.listeners) listener()
  }

  private pump(): void {
    while (this.active < CONCURRENCY && this.queue.length > 0) {
      const id = this.queue.shift()!
      this.active++
      void this.process(id).finally(() => {
        this.active--
        this.inFlight.delete(id)
        const finished = this.active === 0 && this.queue.length === 0
        this.setProgress(finished ? IDLE : { ...this.progress, done: this.progress.done + 1 })
        this.pump()
      })
    }
  }

  private async process(id: string): Promise<void> {
    const resource = await storage.get(id)
    if (!resource || resource.deletedAt || resource.enrichStatus !== 'pending') return

    try {
      const metadata = await scrapeMetadata(resource.url)
      const changes: ResourceChanges = {
        title: metadata.title || resource.title,
        summary: metadata.summary,
        imageUrl: metadata.imageUrl,
        type: metadata.type,
        tags: metadata.tags,
        enrichStatus: undefined,
      }
      // Acortadores: guardamos la URL final si no choca con otro recurso
      if (metadata.url !== resource.url && !(await storage.findByUrl(metadata.url))) {
        changes.url = metadata.url
      }
      await storage.update(id, changes)
    } catch {
      await storage.update(id, { enrichStatus: 'failed' })
    }
  }
}

export const enrichment = new EnrichmentQueue()
