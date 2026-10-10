import axios from 'axios'
import { load } from 'cheerio'
import { detectType, extractTags, fallbackMetadata, urlToText } from '../../src/services/classify.ts'
import { getDomain, normalizeUrl } from '../../src/services/url.ts'
import type { ScrapeResult } from '../../src/types/resource.ts'
import { BlockedUrlError, BROWSER_USER_AGENT, fetchPage } from './fetchPage.ts'

const SCRAPE_TIMEOUT_MS = 8000
const YOUTUBE_DESCRIPTION_TIMEOUT_MS = 4000
const MAX_SUMMARY_LENGTH = 400

/** Acortadores: aquí sí guardamos la URL final tras las redirecciones. */
const SHORTENERS = new Set(['bit.ly', 't.co', 'lnkd.in', 'goo.gl', 'tinyurl.com', 'ow.ly', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'is.gd', 'shorturl.at'])

/** Páginas de bloqueo anti-bots que responden 200. */
const CHALLENGE_TITLES = /^(just a moment|attention required|access denied|un momento|verifying you are human|security check)/i

/**
 * Metadatos de una URL ya normalizada. Nunca falla por culpa del sitio:
 * si algo sale mal devuelve datos deducidos de la URL (`fallback: true`).
 * Solo lanza `BlockedUrlError` si la URL apunta a una red privada.
 */
export async function extractMetadata(url: string): Promise<ScrapeResult> {
  const signal = AbortSignal.timeout(SCRAPE_TIMEOUT_MS)
  try {
    if (isYoutube(url)) {
      const fromYoutube = await extractYoutube(url, signal)
      if (fromYoutube) return fromYoutube
    }
    return await extractFromHtml(url, signal)
  } catch (err) {
    if (err instanceof BlockedUrlError) throw err
    return fallbackMetadata(url)
  }
}

async function extractFromHtml(url: string, signal: AbortSignal): Promise<ScrapeResult> {
  const page = await fetchPage(url, signal)
  const finalUrl = SHORTENERS.has(getDomain(url)) ? (normalizeUrl(page.finalUrl) ?? url) : url
  if (!page.html) {
    // PDF, imagen, etc.: no hay <head> que leer
    return { ...fallbackMetadata(finalUrl), fallback: false }
  }

  const $ = load(page.html)
  const meta = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = $(`meta[property="${key}"], meta[name="${key}"]`).first().attr('content')
      if (value?.trim()) return clean(value)
    }
    return undefined
  }

  const title = meta('og:title', 'twitter:title') ?? clean($('title').first().text())
  if (!title || CHALLENGE_TITLES.test(title)) return fallbackMetadata(finalUrl)

  const summary = truncate(meta('og:description', 'twitter:description', 'description') ?? '')
  const imageUrl = absoluteHttpUrl(meta('og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'), page.finalUrl)
  const ogType = meta('og:type')

  return {
    url: finalUrl,
    title,
    summary,
    imageUrl,
    siteName: meta('og:site_name') ?? getDomain(finalUrl),
    type: detectType(finalUrl, ogType),
    tags: extractTags(title, summary, urlToText(finalUrl)),
    fallback: false,
  }
}

function isYoutube(url: string): boolean {
  const domain = getDomain(url)
  return domain === 'youtube.com' || domain === 'm.youtube.com' || domain === 'youtu.be'
}

interface YoutubeOEmbed {
  title?: string
  author_name?: string
  thumbnail_url?: string
}

async function extractYoutube(url: string, signal: AbortSignal): Promise<ScrapeResult | null> {
  const { data } = await axios.get<YoutubeOEmbed>('https://www.youtube.com/oembed', {
    params: { url, format: 'json' },
    signal,
    headers: { 'User-Agent': BROWSER_USER_AGENT },
  })
  if (!data?.title) return null

  // oEmbed no trae descripción: la intentamos leer del <head>, sin bloquear si falla
  let description = ''
  try {
    const page = await fetchPage(url, AbortSignal.any([signal, AbortSignal.timeout(YOUTUBE_DESCRIPTION_TIMEOUT_MS)]))
    description = clean(load(page.html)('meta[property="og:description"]').attr('content') ?? '')
  } catch {
    // ignorado: nos quedamos con lo que dio oEmbed
  }
  const summary = truncate(description || (data.author_name ? `Video de ${data.author_name}` : ''))

  return {
    url,
    title: clean(data.title),
    summary,
    imageUrl: data.thumbnail_url,
    siteName: data.author_name ? `YouTube · ${data.author_name}` : 'YouTube',
    type: 'video',
    tags: extractTags(data.title, description),
    fallback: false,
  }
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function truncate(text: string): string {
  return text.length > MAX_SUMMARY_LENGTH ? `${text.slice(0, MAX_SUMMARY_LENGTH - 1).trimEnd()}…` : text
}

function absoluteHttpUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value, base)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}
