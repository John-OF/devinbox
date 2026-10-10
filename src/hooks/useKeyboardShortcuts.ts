import { useEffect, useRef } from 'react'

/** Tecla (`e.key` en minúsculas, o "enter") → acción. */
export type ShortcutMap = Record<string, () => void>

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/**
 * Atajos globales de una sola tecla. Se ignoran mientras escribes en un input,
 * con modificadores (Ctrl/Cmd/Alt) o cuando `enabled` es false (p. ej. con un modal abierto).
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true): void {
  const latest = useRef(shortcuts)
  useEffect(() => {
    latest.current = shortcuts
  })

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.repeat && event.key === 'Enter') return
      if (isTypingTarget(event.target)) return
      // Enter sobre un botón o link enfocado debe hacer lo suyo, no abrir el recurso
      if (event.key === 'Enter' && event.target instanceof HTMLElement && event.target.closest('button, a')) return
      const action = latest.current[event.key.toLowerCase()]
      if (!action) return
      event.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
