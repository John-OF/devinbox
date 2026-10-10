import type { ScrapeResult } from '../types/resource.ts'
import { fallbackMetadata } from './classify.ts'

const SCRAPE_TIMEOUT_MS = 15_000

/**
 * Pide metadatos al scraper. Lanza si el servidor no responde (recurso queda "reintentable");
 * si el servidor rechaza la URL (400), devuelve el fallback porque reintentar no cambiaría nada.
 */
export async function scrapeMetadata(url: string): Promise<ScrapeResult> {
  const response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
  })
  if (response.status === 400) return fallbackMetadata(url)
  if (!response.ok) throw new Error(`El scraper respondió ${response.status}`)
  return (await response.json()) as ScrapeResult
}
