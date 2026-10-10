import { CircleCheck, FileUp, LoaderCircle, MessageCircle, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useEnrichmentProgress } from '../hooks/useResources.ts'
import { importLinks, splitNewLinks } from '../services/resources.ts'
import { getDomain } from '../services/url.ts'
import { parseWhatsAppChat, type ExtractedLink } from '../services/whatsapp.ts'
import { cn } from './meta.ts'

/** Dominios que casi nunca son recursos: arrancan desmarcados. */
const UNCHECKED_BY_DEFAULT = ['chat.whatsapp.com', 'wa.me', 'maps.app.goo.gl', 'maps.google.com', 'meet.google.com', 'zoom.us']

type Step =
  | { kind: 'select'; error?: string }
  | { kind: 'review'; fileName: string; totalFound: number; unique: number; duplicates: number; fresh: ExtractedLink[] }
  | { kind: 'importing'; imported: number }

interface Props {
  onClose: () => void
  onImported: () => void
}

export function ImportWhatsAppDialog({ onClose, onImported }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState<Step>({ kind: 'select' })
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const { links, totalFound } = parseWhatsAppChat(await file.text())
      if (links.length === 0) {
        setStep({ kind: 'select', error: `No se encontraron links en "${file.name}". ¿Es el .txt exportado de WhatsApp?` })
        return
      }
      const { fresh, duplicates } = await splitNewLinks(links)
      const domains = new Set(fresh.map((link) => getDomain(link.url)))
      setExcluded(new Set(UNCHECKED_BY_DEFAULT.filter((domain) => domains.has(domain))))
      setStep({ kind: 'review', fileName: file.name, totalFound, unique: links.length, duplicates, fresh })
    } catch (error) {
      setStep({ kind: 'select', error: `No se pudo leer el archivo: ${String(error)}` })
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(links: ExtractedLink[]) {
    setBusy(true)
    try {
      const imported = await importLinks(links)
      setStep({ kind: 'importing', imported })
      onImported()
    } finally {
      setBusy(false)
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    void handleFile(event.dataTransfer.files[0])
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-950/40 backdrop:backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <h2 className="flex items-center gap-2 font-semibold">
          <MessageCircle className="size-5 text-emerald-600" aria-hidden />
          Importar chat de WhatsApp
        </h2>
        <button onClick={() => dialogRef.current?.close()} aria-label="Cerrar" className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <X className="size-4" />
        </button>
      </div>

      <div className="p-5">
        {step.kind === 'select' && (
          <div className="flex flex-col gap-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>En WhatsApp, abre el chat con tus links.</li>
              <li>
                Menú <b>⋮</b> → <b>Más</b> → <b>Exportar chat</b> → <b>Sin archivos</b>.
              </li>
              <li>Sube aquí el <code className="text-xs">.txt</code> (si te llega un .zip, descomprímelo antes).</li>
            </ol>
            <label
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition',
                dragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700',
              )}
            >
              {busy ? <LoaderCircle className="size-7 animate-spin text-zinc-400" /> : <FileUp className="size-7 text-zinc-400" />}
              <span className="text-sm font-medium">Arrastra el archivo o haz clic para elegirlo</span>
              <span className="text-xs text-zinc-500">_chat.txt</span>
              <input
                type="file"
                accept=".txt,text/plain"
                className="sr-only"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
            </label>
            {step.error && <p className="text-sm text-red-600">{step.error}</p>}
          </div>
        )}

        {step.kind === 'review' && (
          <ReviewStep step={step} excluded={excluded} onExcludedChange={setExcluded} busy={busy} onImport={handleImport} />
        )}

        {step.kind === 'importing' && <ImportingStep imported={step.imported} onClose={() => dialogRef.current?.close()} />}
      </div>
    </dialog>
  )
}

interface ReviewStepProps {
  step: Extract<Step, { kind: 'review' }>
  excluded: Set<string>
  onExcludedChange: (excluded: Set<string>) => void
  busy: boolean
  onImport: (links: ExtractedLink[]) => void
}

function ReviewStep({ step, excluded, onExcludedChange, busy, onImport }: ReviewStepProps) {
  const domains = useMemo(() => {
    const counts = new Map<string, number>()
    for (const link of step.fresh) {
      const domain = getDomain(link.url)
      counts.set(domain, (counts.get(domain) ?? 0) + 1)
    }
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [step.fresh])

  const selected = step.fresh.filter((link) => !excluded.has(getDomain(link.url)))

  function toggle(domain: string) {
    const next = new Set(excluded)
    if (next.has(domain)) next.delete(domain)
    else next.add(domain)
    onExcludedChange(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="links en el chat" value={step.totalFound} />
        <Stat label="únicos" value={step.unique} />
        <Stat label="ya los tenías" value={step.duplicates} />
      </dl>

      {step.fresh.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Todos los links de este chat ya están en tu DevInbox (o los descartaste antes).</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Dominios ({domains.length})</span>
            <span className="flex gap-3 text-xs">
              <button className="text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => onExcludedChange(new Set())}>
                Todos
              </button>
              <button
                className="text-indigo-600 hover:underline dark:text-indigo-400"
                onClick={() => onExcludedChange(new Set(domains.map(([domain]) => domain)))}
              >
                Ninguno
              </button>
            </span>
          </div>
          <ul className="max-h-60 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            {domains.map(([domain, count]) => (
              <li key={domain} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                <label className="flex cursor-pointer items-center gap-3 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <input type="checkbox" checked={!excluded.has(domain)} onChange={() => toggle(domain)} className="accent-indigo-600" />
                  <span className="min-w-0 flex-1 truncate">{domain}</span>
                  <span className="text-xs text-zinc-400 tabular-nums">{count}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      <button
        disabled={busy || selected.length === 0}
        onClick={() => onImport(selected)}
        className="flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy && <LoaderCircle className="size-4 animate-spin" />}
        Importar {selected.length} {selected.length === 1 ? 'link' : 'links'} al Inbox
      </button>
    </div>
  )
}

function ImportingStep({ imported, onClose }: { imported: number; onClose: () => void }) {
  const progress = useEnrichmentProgress()
  const finished = !progress.running
  const percent = finished ? 100 : Math.round((progress.done / Math.max(progress.total, 1)) * 100)

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm">
        {finished ? (
          <CircleCheck className="size-5 text-emerald-600" aria-hidden />
        ) : (
          <LoaderCircle className="size-5 animate-spin text-indigo-600" aria-hidden />
        )}
        {finished
          ? `Listo: ${imported} recursos importados al Inbox.`
          : `${imported} links guardados. Obteniendo títulos e imágenes… ${progress.done}/${progress.total}`}
      </p>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div className="h-full rounded-full bg-indigo-600 transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
      {!finished && <p className="text-xs text-zinc-500">Puedes cerrar esta ventana: la importación sigue en segundo plano.</p>}
      <button
        onClick={onClose}
        className="h-10 rounded-lg border border-zinc-200 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {finished ? 'Ver mi Inbox' : 'Cerrar'}
      </button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse rounded-lg bg-zinc-100 px-2 py-2 dark:bg-zinc-800">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
