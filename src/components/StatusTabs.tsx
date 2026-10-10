import type { StatusCounts } from '../services/storage/index.ts'
import { RESOURCE_STATUSES, type ResourceStatus } from '../types/resource.ts'
import { cn, STATUS_META } from './meta.ts'

interface Props {
  value: ResourceStatus
  counts: StatusCounts
  onChange: (status: ResourceStatus) => void
}

export function StatusTabs({ value, counts, onChange }: Props) {
  return (
    <div role="tablist" aria-label="Estado" className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
      {RESOURCE_STATUSES.map((status) => {
        const { label, Icon } = STATUS_META[status]
        const active = status === value
        return (
          <button
            key={status}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(status)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium whitespace-nowrap transition sm:gap-2 sm:px-3',
              active
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200',
            )}
          >
            <Icon className="hidden size-4 sm:block" aria-hidden />
            <span>{label}</span>
            <span className={cn('tabular-nums text-xs', active ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400')}>
              {counts[status]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
