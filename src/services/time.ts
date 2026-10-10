const formatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

// Sin semanas: "hace 18 días" se lee mejor que "hace 3 semanas" para medir el olvido.
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "hace 18 días", "ayer", "hace 3 meses"... */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = (new Date(iso).getTime() - now) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.trunc(seconds / size), unit)
  }
  return 'justo ahora'
}
