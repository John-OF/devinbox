// Parser del `_chat.txt` que exporta WhatsApp ("Exportar chat" → "Sin archivos").
import { normalizeUrl } from './url.ts'

export interface ExtractedLink {
  url: string
  /** Fecha del primer mensaje en que apareció el link. */
  date?: Date
}

export interface WhatsAppParseResult {
  links: ExtractedLink[]
  /** Links encontrados antes de deduplicar. */
  totalFound: number
}

// Cabecera de mensaje. Ejemplos:
//   Android: "10/10/26, 13:56 - Ana: hola"   "10/10/26, 1:56 p. m. - Ana: hola"
//   iOS:     "[10/10/26, 13:56:02] Ana: hola"
const HEADER =
  /^\[?(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap])\.?\s?m\.?)?\]?\s*(?:[-–]\s+)?/i

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"'`]+/gi
// Puntuación y formato de WhatsApp (*negrita*, _cursiva_, ~tachado~) pegados al final del link
const TRAILING_JUNK = /[.,;:!?*_~'"»”’>\]}]+$/

type DateOrder = 'dmy' | 'mdy' | 'ymd'

interface Header {
  a: number
  b: number
  c: number
  hour: number
  minute: number
  second: number
  meridiem?: string
  rest: string
}

function parseHeader(line: string): Header | null {
  const match = HEADER.exec(line)
  if (!match) return null
  const [whole, a, b, c, hour, minute, second, meridiem] = match
  return {
    a: Number(a),
    b: Number(b),
    c: Number(c),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second ?? 0),
    meridiem: meridiem?.toLowerCase(),
    rest: line.slice(whole.length),
  }
}

/** dd/mm por defecto (locale es); si algún mensaje tiene el segundo campo > 12, el archivo es mm/dd. */
function detectOrder(headers: Header[]): DateOrder {
  if (headers.some((h) => h.a > 31)) return 'ymd'
  if (headers.some((h) => h.a > 12)) return 'dmy'
  if (headers.some((h) => h.b > 12)) return 'mdy'
  return 'dmy'
}

function toDate(header: Header, order: DateOrder): Date | undefined {
  const [day, month, year] =
    order === 'ymd' ? [header.c, header.b, header.a] : order === 'mdy' ? [header.b, header.a, header.c] : [header.a, header.b, header.c]
  const fullYear = year < 100 ? 2000 + year : year
  let hour = header.hour
  if (header.meridiem === 'p' && hour < 12) hour += 12
  if (header.meridiem === 'a' && hour === 12) hour = 0

  const date = new Date(fullYear, month - 1, day, hour, header.minute, header.second)
  // new Date corrige fechas imposibles (31/02 → 03/03); las descartamos
  return date.getMonth() === month - 1 && date.getDate() === day ? date : undefined
}

/** Quita la puntuación final sin romper links con paréntesis, como los de Wikipedia. */
function cleanUrl(raw: string): string {
  let url = raw
  for (;;) {
    const trimmed = url.replace(TRAILING_JUNK, '')
    const unbalanced = trimmed.endsWith(')') && (trimmed.match(/\(/g)?.length ?? 0) < (trimmed.match(/\)/g)?.length ?? 0)
    const next = unbalanced ? trimmed.slice(0, -1) : trimmed
    if (next === url) return url
    url = next
  }
}

export function extractUrls(text: string): string[] {
  return (text.match(URL_PATTERN) ?? []).map(cleanUrl)
}

export function parseWhatsAppChat(content: string): WhatsAppParseResult {
  const lines = content
    .replace(/[‎‏‪-‮﻿]/g, '')
    .replace(/[  ]/g, ' ')
    .split(/\r?\n/)

  const parsed = lines.map((line) => ({ line, header: parseHeader(line) }))
  const order = detectOrder(parsed.flatMap((p) => (p.header ? [p.header] : [])))

  const earliest = new Map<string, Date | undefined>()
  let totalFound = 0
  let currentDate: Date | undefined

  for (const { line, header } of parsed) {
    // Las líneas sin cabecera son continuación del mensaje anterior
    if (header) currentDate = toDate(header, order)
    const text = header ? header.rest : line

    for (const raw of extractUrls(text)) {
      const url = normalizeUrl(raw)
      if (!url) continue
      totalFound++
      const known = earliest.get(url)
      if (!earliest.has(url) || (currentDate && (!known || currentDate < known))) {
        earliest.set(url, currentDate ?? known)
      }
    }
  }

  return {
    links: [...earliest].map(([url, date]) => ({ url, date })),
    totalFound,
  }
}
