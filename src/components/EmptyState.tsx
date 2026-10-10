import { BookOpen, CircleCheck, Archive, SearchX, type LucideIcon } from 'lucide-react'
import type { ResourceStatus } from '../types/resource.ts'

const BY_STATUS: Record<ResourceStatus, { Icon: LucideIcon; title: string; hint: string }> = {
  inbox: {
    Icon: CircleCheck,
    title: 'Inbox zero',
    hint: 'No queda nada por revisar. Pega una URL arriba o importa tu chat de WhatsApp.',
  },
  reading: {
    Icon: BookOpen,
    title: 'Nada en estudio',
    hint: 'Desde el Inbox, pulsa S sobre lo que quieras aprender de verdad.',
  },
  archived: {
    Icon: Archive,
    title: 'El archivo está vacío',
    hint: 'Lo que archives queda aquí, fuera de tu vista pero sin perderse.',
  },
}

interface Props {
  status: ResourceStatus
  filtered: boolean
  onClearFilters: () => void
}

export function EmptyState({ status, filtered, onClearFilters }: Props) {
  const { Icon, title, hint } = filtered
    ? { Icon: SearchX, title: 'Sin resultados', hint: 'Ningún recurso coincide con la búsqueda o el filtro.' }
    : BY_STATUS[status]

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-zinc-800">
      <Icon className="size-8 text-zinc-400" aria-hidden />
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-zinc-500">{hint}</p>
      {filtered && (
        <button onClick={onClearFilters} className="mt-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Limpiar filtros
        </button>
      )}
    </div>
  )
}

export function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-2" aria-label="Cargando…">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="aspect-video w-24 animate-pulse rounded-lg bg-zinc-200 sm:w-36 dark:bg-zinc-800" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </li>
      ))}
    </ul>
  )
}
