import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { captureUrl, type CaptureResult } from '../services/resources.ts'
import { extractUrls } from '../services/whatsapp.ts'

const SHARE_PATH = '/share'

/**
 * Procesa lo compartido con la PWA (Web Share Target: `/share?title=&text=&url=`).
 * WhatsApp y otras apps suelen mandar el link dentro de `text`, no de `url`.
 */
export function useShareTarget(onCaptured: (result: CaptureResult) => void): void {
  const latest = useRef(onCaptured)
  useEffect(() => {
    latest.current = onCaptured
  })

  useEffect(() => {
    if (window.location.pathname !== SHARE_PATH) return
    const params = new URLSearchParams(window.location.search)
    // Limpiamos la URL ya: un refresco no debe volver a capturar
    window.history.replaceState(null, '', '/')

    const shared = [params.get('url'), params.get('text'), params.get('title')]
    const candidate = shared.flatMap((value) => (value ? extractUrls(value) : []))[0]
    if (!candidate) {
      toast.error('No encontré ningún link en lo que compartiste')
      return
    }

    void captureUrl(candidate).then((result) => {
      if (result.kind === 'created') toast.success('Guardado en tu Inbox')
      latest.current(result)
    })
  }, [])
}
