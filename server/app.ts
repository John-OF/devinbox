import express, { type ErrorRequestHandler } from 'express'
import { z } from 'zod'
import { normalizeUrl } from '../src/services/url.ts'
import { extractMetadata } from './scrape/extractMetadata.ts'
import { BlockedUrlError } from './scrape/fetchPage.ts'

const scrapeQuery = z.object({ url: z.string().min(1).max(2048) })

export const app = express()
app.disable('x-powered-by')

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/scrape', async (req, res) => {
  const query = scrapeQuery.safeParse(req.query)
  const url = query.success ? normalizeUrl(query.data.url) : null
  if (!url) {
    res.status(400).json({ error: 'Parámetro "url" ausente o inválido' })
    return
  }

  try {
    const metadata = await extractMetadata(url)
    res.set('Cache-Control', 'private, max-age=3600').json(metadata)
  } catch (err) {
    if (err instanceof BlockedUrlError) {
      res.status(400).json({ error: err.message })
      return
    }
    throw err
  }
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'No encontrado' })
})

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[api]', err)
  res.status(500).json({ error: 'Error interno' })
}
app.use(errorHandler)
