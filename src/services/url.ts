// Lógica pura de URLs, compartida entre la web y el servidor (sin DOM ni Node).

const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'igshid', 'mc_cid', 'mc_eid', 'ref_src'])
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'])

/** Hostname sin `www.`, para mostrar y clasificar. */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Normaliza una URL para guardarla y detectar duplicados.
 * Devuelve null si no es una URL http(s) válida.
 */
export function normalizeUrl(input: string): string | null {
  let raw = input.trim()
  if (!raw) return null
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(raw)) {
    // "www.sitio.com/x" o "sitio.com/x" sin esquema
    if (!/^[\w-]+(\.[\w-]+)+(:\d+)?([/?#]|$)/.test(raw)) return null
    raw = `https://${raw}`
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null

  // youtu.be/ID y /shorts/ID → youtube.com/watch?v=ID
  if (url.hostname === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    if (id) {
      const t = url.searchParams.get('t')
      url = new URL(`https://www.youtube.com/watch?v=${id}`)
      if (t) url.searchParams.set('t', t)
    }
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    url.hostname = 'www.youtube.com'
    const shorts = url.pathname.match(/^\/shorts\/([\w-]+)/)
    if (shorts) {
      url.pathname = '/watch'
      url.search = `?v=${shorts[1]}`
    }
  }

  const isYoutube = url.hostname === 'www.youtube.com'
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_') || TRACKING_PARAMS.has(key) || (isYoutube && (key === 'si' || key === 'feature'))) {
      url.searchParams.delete(key)
    }
  }

  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '')
  }
  if (url.hash === '#') url.hash = ''

  return url.toString()
}

/** Título legible deducido solo de la URL (fallback cuando no hay metadatos). */
export function titleFromUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  const domain = parsed.hostname.replace(/^www\./, '')
  const segments = parsed.pathname.split('/').filter(Boolean).map(safeDecode)

  if (/(^|\.)(github|gitlab)\.com$/.test(domain) && segments.length >= 2) {
    return `${segments[0]}/${segments[1]}`
  }
  if (segments.length === 0) return domain

  const last = segments[segments.length - 1]
    .replace(/\.(html?|php|aspx?)$/i, '')
    .replace(/[-_+]+/g, ' ')
    .trim()
  // IDs opacos (hashes, números, códigos de acortador como "3QwBzVb") no sirven como título
  const looksLikeId =
    /^[\da-f]{8,}$/i.test(last) || /^\d+$/.test(last) || (/\d/.test(last) && /[A-Z]/.test(last.slice(1)) && !/\s/.test(last))
  if (!last || looksLikeId) return domain
  return `${last.charAt(0).toUpperCase()}${last.slice(1)}`
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}
