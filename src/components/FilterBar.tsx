import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { RESOURCE_TYPES, type ResourceType } from '../types/resource.ts'
import { cn, TYPE_META } from './meta.ts'

interface Props {
  search: string
  onSearchChange: (search: string) => void
  type: ResourceType | undefined
  onTypeChange: (type: ResourceType | undefined) => void
  typeCounts: Record<ResourceType, number>
  total: number
}

export function FilterBar({ search, onSearchChange, type, onTypeChange, typeCounts, total }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onSearchChange('')
              event.currentTarget.blur()
            }
          }}
          placeholder="Buscar por título, dominio, etiqueta…"
          aria-label="Buscar"
          className="h-9 w-full rounded-lg border border-zinc-200 bg-white pr-3 pl-9 text-sm outline-none placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-900"
        />
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={!type} onClick={() => onTypeChange(undefined)} label="Todos" count={total} />
        {RESOURCE_TYPES.filter((t) => typeCounts[t] > 0 || t === type).map((t) => {
          const { label, Icon } = TYPE_META[t]
          return (
            <Chip
              key={t}
              active={type === t}
              onClick={() => onTypeChange(type === t ? undefined : t)}
              label={label}
              count={typeCounts[t]}
              icon={<Icon className="size-3.5" aria-hidden />}
            />
          )
        })}
      </div>
    </div>
  )
}

interface ChipProps {
  active: boolean
  onClick: () => void
  label: string
  count: number
  icon?: ReactNode
}

function Chip({ active, onClick, label, count, icon }: ChipProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
        active
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
      )}
    >
      {icon}
      {label}
      <span className={cn('tabular-nums', active ? 'text-indigo-100' : 'text-zinc-400')}>{count}</span>
    </button>
  )
}
