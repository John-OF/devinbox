import { describe, expect, it } from 'vitest'
import { detectType, extractTags, fallbackMetadata } from './classify.ts'

describe('detectType', () => {
  it.each([
    ['https://www.youtube.com/watch?v=x', 'video'],
    ['https://github.com/vitejs/vite', 'repo'],
    ['https://github.com/vitejs', 'otro'],
    ['https://gist.github.com/ana/abc', 'repo'],
    ['https://www.udemy.com/course/react', 'curso'],
    ['https://www.freecodecamp.org/news/some-post', 'articulo'],
    ['https://www.freecodecamp.org/learn/javascript', 'curso'],
    ['https://www.npmjs.com/package/dexie', 'herramienta'],
    ['https://ana.medium.com/post', 'articulo'],
    ['https://example.com/blog/post-1', 'articulo'],
    ['https://example.com/', 'otro'],
  ] as const)('%s → %s', (url, expected) => {
    expect(detectType(url)).toBe(expected)
  })

  it('usa og:type cuando el dominio no dice nada', () => {
    expect(detectType('https://example.com/x', 'video.other')).toBe('video')
    expect(detectType('https://example.com/x', 'article')).toBe('articulo')
  })
})

describe('extractTags', () => {
  it('detecta términos por palabra completa', () => {
    expect(extractTags('Aprende React y TypeScript con Node.js')).toEqual(expect.arrayContaining(['react', 'typescript', 'node']))
  })

  it('no confunde JavaScript con Java ni Golang con "go"', () => {
    const tags = extractTags('JavaScript moderno: go to the docs')
    expect(tags).toContain('javascript')
    expect(tags).not.toContain('java')
    expect(tags).not.toContain('go')
  })

  it('ordena por frecuencia y limita a 5', () => {
    const tags = extractTags('docker docker docker css css python react vue svelte angular')
    expect(tags).toHaveLength(5)
    expect(tags.slice(0, 2)).toEqual(['docker', 'css'])
  })
})

describe('fallbackMetadata', () => {
  it('deduce título, tipo y etiquetas solo de la URL', () => {
    expect(fallbackMetadata('https://www.udemy.com/course/react-the-complete-guide')).toMatchObject({
      title: 'React the complete guide',
      type: 'curso',
      tags: ['react'],
      fallback: true,
    })
  })
})
