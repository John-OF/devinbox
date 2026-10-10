import { FileUp, Inbox, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast, Toaster } from 'sonner'
import { CaptureBar } from './components/CaptureBar.tsx'
import { EmptyState, ListSkeleton } from './components/EmptyState.tsx'
import { FilterBar } from './components/FilterBar.tsx'
import { ImportWhatsAppDialog } from './components/ImportWhatsAppDialog.tsx'
import { STATUS_META } from './components/meta.ts'
import { ResourceCard } from './components/ResourceCard.tsx'
import { StatusTabs } from './components/StatusTabs.tsx'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.ts'
import { useShareTarget } from './hooks/useShareTarget.ts'
import { useEnrichmentProgress, useResourcesByStatus, useStatusCounts } from './hooks/useResources.ts'
import { enrichment } from './services/enrichment.ts'
import {
  filterResources,
  markVisited,
  openResource,
  removeResource,
  restoreResource,
  retryEnrichment,
  setStatus as saveStatus,
  type CaptureResult,
} from './services/resources.ts'
import { RESOURCE_TYPES, type Resource, type ResourceStatus, type ResourceType } from './types/resource.ts'

export default function App() {
  const [status, setStatus] = useState<ResourceStatus>('inbox')
  const [type, setType] = useState<ResourceType>()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const counts = useStatusCounts()
  const progress = useEnrichmentProgress()
  const resources = useResourcesByStatus(status)

  const visible = useMemo(() => (resources ? filterResources(resources, { type, search }) : []), [resources, type, search])
  const typeCounts = useMemo(() => {
    const result = Object.fromEntries(RESOURCE_TYPES.map((t) => [t, 0])) as Record<ResourceType, number>
    for (const resource of resources ?? []) result[resource.type]++
    return result
  }, [resources])

  const selectedIndex = visible.findIndex((resource) => resource.id === selectedId)
  const selected = selectedIndex === -1 ? undefined : visible[selectedIndex]

  useEffect(() => {
    void enrichment.resumePending()
  }, [])

  function changeStatus(next: ResourceStatus) {
    setStatus(next)
    setSelectedId(null)
  }

  function clearFilters() {
    setType(undefined)
    setSearch('')
  }

  /** Al sacar un recurso de la lista, la selección pasa al siguiente (o al anterior). */
  function selectNeighborOf(resource: Resource) {
    if (resource.id !== selectedId) return
    const index = visible.findIndex((r) => r.id === resource.id)
    setSelectedId(visible[index + 1]?.id ?? visible[index - 1]?.id ?? null)
  }

  function move(resource: Resource, to: ResourceStatus) {
    if (resource.status === to) return
    selectNeighborOf(resource)
    void saveStatus(resource.id, to)
  }

  function remove(resource: Resource) {
    selectNeighborOf(resource)
    void removeResource(resource.id)
    toast('Recurso eliminado', {
      description: resource.title,
      duration: 8000,
      action: {
        label: 'Deshacer',
        onClick: () => {
          void restoreResource(resource.id)
          setSelectedId(resource.id)
        },
      },
    })
  }

  function moveSelection(delta: 1 | -1) {
    if (visible.length === 0) return
    const next =
      selectedIndex === -1
        ? delta === 1 ? 0 : visible.length - 1
        : Math.min(visible.length - 1, Math.max(0, selectedIndex + delta))
    setSelectedId(visible[next].id)
  }

  function handleCaptured(result: CaptureResult) {
    if (result.kind === 'invalid') {
      toast.error('Eso no parece una URL válida')
      return
    }
    if (result.kind === 'exists') {
      toast.info('Ya lo tenías guardado', {
        description: `${result.resource.title} · ${STATUS_META[result.resource.status].label}`,
      })
    } else if (result.kind === 'revived') {
      toast.success('Recuperado', { description: 'Lo habías descartado antes; vuelve al Inbox.' })
    }
    setStatus(result.resource.status)
    clearFilters()
    setSelectedId(result.resource.id)
  }

  useShareTarget(handleCaptured)

  useKeyboardShortcuts({
    j: () => moveSelection(1),
    k: () => moveSelection(-1),
    enter: () => selected && openResource(selected),
    s: () => selected && move(selected, 'reading'),
    a: () => selected && move(selected, 'archived'),
    d: () => selected && remove(selected),
    escape: () => setSelectedId(null),
  }, !importOpen)

  const filtered = Boolean(type || search.trim())

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2" title="DevInbox">
            <Inbox className="size-6 text-indigo-600 dark:text-indigo-400" aria-hidden />
            <h1 className="hidden text-lg font-semibold tracking-tight sm:block">DevInbox</h1>
          </div>
          <CaptureBar onCaptured={handleCaptured} />
          <button
            onClick={() => setImportOpen(true)}
            title="Importar chat de WhatsApp"
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <FileUp className="size-4" aria-hidden />
            <span className="hidden sm:inline">Importar</span>
          </button>
        </div>
        {progress.running && (
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 pb-2 text-xs text-zinc-500" role="status">
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
            Obteniendo datos {progress.done}/{progress.total}
          </div>
        )}
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4">
        <StatusTabs value={status} counts={counts} onChange={changeStatus} />
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          type={type}
          onTypeChange={setType}
          typeCounts={typeCounts}
          total={resources?.length ?? 0}
        />

        {resources === null ? (
          <ListSkeleton />
        ) : visible.length === 0 ? (
          <EmptyState status={status} filtered={filtered} onClearFilters={clearFilters} />
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                selected={resource.id === selectedId}
                onSelect={() => setSelectedId(resource.id)}
                onOpen={() => openResource(resource)}
                onVisited={() => void markVisited(resource.id)}
                onMove={(to) => move(resource, to)}
                onDelete={() => remove(resource)}
                onRetry={() => void retryEnrichment(resource.id)}
              />
            ))}
          </ul>
        )}

        <p className="hidden justify-center gap-4 pt-2 text-xs text-zinc-400 sm:flex">
          <Kbd k="J/K">navegar</Kbd>
          <Kbd k="Enter">abrir</Kbd>
          <Kbd k="S">estudio</Kbd>
          <Kbd k="A">archivar</Kbd>
          <Kbd k="D">eliminar</Kbd>
        </p>
      </main>

      {importOpen && (
        <ImportWhatsAppDialog
          onClose={() => setImportOpen(false)}
          onImported={() => {
            changeStatus('inbox')
            clearFilters()
          }}
        />
      )}

      <Toaster position="bottom-center" theme="system" closeButton />
    </div>
  )
}

function Kbd({ k, children }: { k: string; children: string }) {
  return (
    <span>
      <kbd className="rounded border border-zinc-300 px-1 font-mono text-[11px] dark:border-zinc-700">{k}</kbd> {children}
    </span>
  )
}
