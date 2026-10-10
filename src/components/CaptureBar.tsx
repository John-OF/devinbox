import { LoaderCircle, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { captureUrl, type CaptureResult } from '../services/resources.ts'

interface Props {
  onCaptured: (result: CaptureResult) => void
}

export function CaptureBar({ onCaptured }: Props) {
  const [value, setValue] = useState('')
  const [inFlight, setInFlight] = useState(0)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const input = value.trim()
    if (!input) return
    // Vaciamos ya, para poder pegar la siguiente URL sin esperar
    setValue('')
    setInFlight((n) => n + 1)
    try {
      const result = await captureUrl(input)
      if (result.kind === 'invalid') setValue((current) => current || input)
      onCaptured(result)
    } catch (error) {
      setValue((current) => current || input)
      toast.error('No se pudo guardar', { description: String(error) })
    } finally {
      setInFlight((n) => n - 1)
    }
  }

  const busy = inFlight > 0
  const Icon = busy ? LoaderCircle : Plus

  return (
    <form onSubmit={handleSubmit} className="relative min-w-0 flex-1">
      <Icon
        aria-hidden
        className={`pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400 ${busy ? 'animate-spin' : ''}`}
      />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && event.currentTarget.blur()}
        placeholder="Pega una URL y pulsa Enter"
        aria-label="URL a guardar"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        className="h-10 w-full rounded-lg border border-zinc-200 bg-white pr-3 pl-9 text-sm shadow-xs outline-none placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-900"
      />
    </form>
  )
}
