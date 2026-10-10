import { ExternalLink, RotateCw, Trash2, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { timeAgo } from '../services/time.ts'
import { getDomain } from '../services/url.ts'
import { RESOURCE_STATUSES, type Resource, type ResourceStatus } from '../types/resource.ts'
import { cn, STATUS_META, TYPE_META } from './meta.ts'

interface Props {
  resource: Resource
  selected: boolean
  onSelect: () => void
  onOpen: () => void
  onVisited: () => void
  onMove: (status: ResourceStatus) => void
  onDelete: () => void
  onRetry: () => void
}

export function ResourceCard({ resource, selected, onSelect, onOpen, onVisited, onMove, onDelete, onRetry }: Props) {
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const pending = resource.enrichStatus === 'pending'
  const failed = resource.enrichStatus === 'failed'
  const { label: typeLabel, Icon: TypeIcon } = TYPE_META[resource.type]
  const created = new Date(resource.createdAt)

  return (
    <li
      ref={ref}
      onClick={onSelect}
      aria-current={selected || undefined}
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-white p-3 transition sm:flex-row dark:bg-zinc-900',
        selected
          ? 'border-indigo-500 ring-2 ring-indigo-500/25'
          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700',
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <Thumbnail resource={resource} pending={pending} />

        <div className="min-w-0 flex-1">
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              event.stopPropagation()
              onVisited()
            }}
            className="line-clamp-2 leading-snug font-medium break-words hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            {resource.title}
          </a>

          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <TypeIcon className="size-3.5" aria-hidden />
              {typeLabel}
            </span>
            <span aria-hidden>·</span>
            <span className="max-w-48 truncate">{getDomain(resource.url)}</span>
            <span aria-hidden>·</span>
            <time dateTime={resource.createdAt} title={created.toLocaleString('es')}>
              Añadido {timeAgo(resource.createdAt)}
            </time>
          </div>

          {pending ? (
            <div className="mt-2 space-y-1.5" aria-label="Obteniendo datos…">
              <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          ) : (
            resource.summary && (
              <p className="mt-1.5 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{resource.summary}</p>
            )
          )}

          {failed && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-amber-700 dark:text-amber-500">
              No se pudieron obtener los datos.
              <button onClick={stop(onRetry)} className="inline-flex items-center gap-1 font-medium underline">
                <RotateCw className="size-3" aria-hidden />
                Reintentar
              </button>
            </p>
          )}

          {resource.tags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1" aria-label="Etiquetas">
              {resource.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-1 sm:items-start">
        <ActionButton label="Abrir" shortcut="Enter" Icon={ExternalLink} onClick={onOpen} />
        {RESOURCE_STATUSES.filter((status) => status !== resource.status).map((status) => {
          const { moveLabel, shortcut, Icon } = STATUS_META[status]
          return <ActionButton key={status} label={moveLabel} shortcut={shortcut} Icon={Icon} onClick={() => onMove(status)} />
        })}
        <ActionButton label="Eliminar" shortcut="D" Icon={Trash2} onClick={onDelete} danger />
      </div>
    </li>
  )
}

function stop(action: () => void) {
  return (event: MouseEvent) => {
    event.stopPropagation()
    action()
  }
}

function Thumbnail({ resource, pending }: { resource: Resource; pending: boolean }) {
  const [broken, setBroken] = useState<string | null>(null)
  const { Icon } = TYPE_META[resource.type]
  const showImage = resource.imageUrl && broken !== resource.imageUrl

  return (
    <div
      className={cn(
        'flex aspect-video w-24 shrink-0 items-center justify-center self-start overflow-hidden rounded-lg bg-zinc-100 sm:w-36 dark:bg-zinc-800',
        pending && !showImage && 'animate-pulse',
      )}
    >
      {showImage ? (
        <img
          src={resource.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(resource.imageUrl ?? null)}
          className="size-full object-cover"
        />
      ) : (
        <Icon className="size-6 text-zinc-400" aria-hidden />
      )}
    </div>
  )
}

interface ActionButtonProps {
  label: string
  shortcut?: string
  Icon: LucideIcon
  onClick: () => void
  danger?: boolean
}

function ActionButton({ label, shortcut, Icon, onClick, danger }: ActionButtonProps) {
  const title = shortcut ? `${label} (${shortcut})` : label
  return (
    <button
      onClick={stop(onClick)}
      title={title}
      aria-label={title}
      className={cn(
        'rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800',
        danger ? 'hover:text-red-600' : 'hover:text-zinc-900 dark:hover:text-zinc-100',
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}
