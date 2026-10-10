import axios from 'axios'
import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import type { Readable } from 'node:stream'

const MAX_REDIRECTS = 5
/** Solo necesitamos el <head>; cortamos antes si es enorme. */
const MAX_BYTES = 1_500_000
export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

/** La URL apunta a una red privada/local o usa un esquema no permitido. */
export class BlockedUrlError extends Error {}

export class HttpStatusError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`HTTP ${status}`)
    this.status = status
  }
}

export interface FetchedPage {
  finalUrl: string
  contentType: string
  html: string
}

const privateRanges = new BlockList()
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
] as const) {
  privateRanges.addSubnet(net, prefix, 'ipv4')
}
privateRanges.addAddress('::', 'ipv6')
privateRanges.addAddress('::1', 'ipv6')
privateRanges.addSubnet('fc00::', 7, 'ipv6')
privateRanges.addSubnet('fe80::', 10, 'ipv6')
privateRanges.addSubnet('ff00::', 8, 'ipv6')

async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BlockedUrlError(`Esquema no permitido: ${url.protocol}`)
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || /\.(localhost|local|internal)$/.test(host)) {
    throw new BlockedUrlError('Host local no permitido')
  }
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true, verbatim: true })).map((a) => a.address)
  for (const address of addresses) {
    if (privateRanges.check(address, isIP(address) === 6 ? 'ipv6' : 'ipv4')) {
      throw new BlockedUrlError('La URL apunta a una red privada')
    }
  }
}

/**
 * Descarga el HTML de una página pública siguiendo redirecciones a mano,
 * para validar cada salto contra redes privadas.
 */
export async function fetchPage(url: string, signal: AbortSignal): Promise<FetchedPage> {
  let current = new URL(url)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current)
    const res = await axios.get<Readable>(current.toString(), {
      responseType: 'stream',
      maxRedirects: 0,
      signal,
      validateStatus: () => true,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    })

    const location = res.headers.location as string | undefined
    if (res.status >= 300 && res.status < 400 && location) {
      res.data.destroy()
      current = new URL(location, current)
      continue
    }
    if (res.status >= 400) {
      res.data.destroy()
      throw new HttpStatusError(res.status)
    }

    const contentType = String(res.headers['content-type'] ?? '')
    if (!/html|xml/i.test(contentType)) {
      res.data.destroy()
      return { finalUrl: current.toString(), contentType, html: '' }
    }
    const buffer = await readUntilHeadEnds(res.data)
    return { finalUrl: current.toString(), contentType, html: decode(buffer, contentType) }
  }

  throw new Error('Demasiadas redirecciones')
}

function readUntilHeadEnds(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    let tail = ''
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
      total += chunk.length
      const text = tail + chunk.toString('latin1')
      if (/<\/head\s*>/i.test(text) || total >= MAX_BYTES) {
        stream.destroy()
        resolve(Buffer.concat(chunks))
        return
      }
      tail = text.slice(-16)
    })
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

function decode(buffer: Buffer, contentType: string): string {
  const fromHeader = contentType.match(/charset=["']?([\w-]+)/i)?.[1]
  const fromMeta = buffer
    .subarray(0, 4096)
    .toString('latin1')
    .match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]
  try {
    return new TextDecoder(fromHeader ?? fromMeta ?? 'utf-8').decode(buffer)
  } catch {
    return new TextDecoder('utf-8').decode(buffer)
  }
}
