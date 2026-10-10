import { describe, expect, it } from 'vitest'
import { extractUrls, parseWhatsAppChat } from './whatsapp.ts'

function byUrl(content: string) {
  const result = parseWhatsAppChat(content)
  return { ...result, map: new Map(result.links.map((link) => [link.url, link.date])) }
}

describe('parseWhatsAppChat', () => {
  it('lee el formato de Android, mensajes multilínea y deduplica quedándose con la fecha más antigua', () => {
    const chat = [
      '10/10/24, 13:56 - Ana: mira esto https://github.com/vitejs/vite',
      '10/10/24, 1:57 p. m. - Luis: *curso*: https://www.udemy.com/course/react/.',
      'sigue el mensaje con www.example.com/guia y (https://en.wikipedia.org/wiki/Rust_(programming_language))',
      '11/10/24, 9:00 - Ana: repetido https://github.com/vitejs/vite/',
      '31/12/24, 23:59 - Ana: <Multimedia omitido>',
    ].join('\n')

    const { links, totalFound, map } = byUrl(chat)

    expect(totalFound).toBe(5)
    expect(links).toHaveLength(4)
    expect(map.get('https://github.com/vitejs/vite')).toEqual(new Date(2024, 9, 10, 13, 56))
    expect(map.get('https://www.udemy.com/course/react')).toEqual(new Date(2024, 9, 10, 13, 57))
    // La línea sin cabecera hereda la fecha del mensaje anterior
    expect(map.get('https://www.example.com/guia')).toEqual(new Date(2024, 9, 10, 13, 57))
    expect(map.has('https://en.wikipedia.org/wiki/Rust_(programming_language)')).toBe(true)
  })

  it('lee el formato de iOS con segundos, AM/PM y marcas invisibles', () => {
    const chat = [
      '[3/2/25, 10:15:30] Ana: https://youtu.be/abc123?si=xx',
      '‎[25/2/25, 8:05:00 PM] Luis: https://dev.to/post',
    ].join('\r\n')

    const { map } = byUrl(chat)

    expect(map.get('https://www.youtube.com/watch?v=abc123')).toEqual(new Date(2025, 1, 3, 10, 15, 30))
    expect(map.get('https://dev.to/post')).toEqual(new Date(2025, 1, 25, 20, 5, 0))
  })

  it('detecta archivos mm/dd cuando el segundo campo pasa de 12', () => {
    const { map } = byUrl('2/25/25, 8:05 PM - Ana: https://a.dev/x\n3/1/25, 9:00 AM - Ana: https://b.dev/y')
    expect(map.get('https://a.dev/x')).toEqual(new Date(2025, 1, 25, 20, 5))
    expect(map.get('https://b.dev/y')).toEqual(new Date(2025, 2, 1, 9, 0))
  })

  it('devuelve vacío si no hay links', () => {
    expect(parseWhatsAppChat('10/10/24, 13:56 - Ana: hola').links).toEqual([])
  })
})

describe('extractUrls', () => {
  it('quita puntuación y formato pegados al final', () => {
    expect(extractUrls('ver https://a.com/x, y _https://b.com/y_ o ~https://c.com~!')).toEqual([
      'https://a.com/x',
      'https://b.com/y',
      'https://c.com',
    ])
  })
})
