import { describe, expect, it } from 'vitest'
import { getDomain, normalizeUrl, titleFromUrl } from './url.ts'

describe('normalizeUrl', () => {
  it.each([
    ['https://youtu.be/ID123?si=abc&t=30', 'https://www.youtube.com/watch?v=ID123&t=30'],
    ['https://m.youtube.com/watch?v=ID123&feature=share', 'https://www.youtube.com/watch?v=ID123'],
    ['https://www.youtube.com/shorts/ID123', 'https://www.youtube.com/watch?v=ID123'],
    ['https://Example.com/a/?utm_source=x&id=2&fbclid=y', 'https://example.com/a?id=2'],
    ['example.com', 'https://example.com/'],
    ['www.example.com/guia/', 'https://www.example.com/guia'],
    ['  https://github.com/facebook/react/  ', 'https://github.com/facebook/react'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected)
  })

  it.each(['esto no es una url', 'javascript:alert(1)', 'ftp://example.com/file', '', 'https://intranet'])('rechaza %j', (input) => {
    expect(normalizeUrl(input)).toBeNull()
  })

  it('no toca el parámetro "si" fuera de YouTube', () => {
    expect(normalizeUrl('https://example.com/?si=1')).toBe('https://example.com/?si=1')
  })
})

describe('titleFromUrl', () => {
  it.each([
    ['https://github.com/vitejs/vite/tree/main', 'vitejs/vite'],
    ['https://blog.dev/posts/how-to-learn-react', 'How to learn react'],
    ['https://bit.ly/3QwBzVb', 'bit.ly'],
    ['https://example.com/', 'example.com'],
    ['https://medium.com/@ana/post-a1b2c3d4e5f6', 'Post a1b2c3d4e5f6'],
  ])('%s → %s', (url, expected) => {
    expect(titleFromUrl(url)).toBe(expected)
  })
})

describe('getDomain', () => {
  it('quita www.', () => {
    expect(getDomain('https://www.udemy.com/course/x')).toBe('udemy.com')
  })
})
