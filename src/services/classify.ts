// Clasificación automática (tipo y etiquetas), compartida entre la web y el servidor.
import type { ResourceType, ScrapeResult } from '../types/resource.ts'
import { getDomain, titleFromUrl } from './url.ts'

interface TypeRule {
  hosts: string[]
  type: ResourceType
  /** La regla aplica solo si la ruta empieza por alguno de estos prefijos. */
  paths?: string[]
  /** Número mínimo de segmentos en la ruta (p. ej. github.com/usuario/repo). */
  minSegments?: number
}

// El orden importa: gana la primera regla que coincide.
const TYPE_RULES: TypeRule[] = [
  { hosts: ['youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv'], type: 'video' },
  { hosts: ['gist.github.com'], type: 'repo' },
  { hosts: ['github.com', 'gitlab.com', 'bitbucket.org', 'codeberg.org'], type: 'repo', minSegments: 2 },
  { hosts: ['freecodecamp.org'], paths: ['/news'], type: 'articulo' },
  { hosts: ['freecodecamp.org'], paths: ['/learn'], type: 'curso' },
  {
    hosts: ['udemy.com', 'coursera.org', 'platzi.com', 'edx.org', 'domestika.org', 'roadmap.sh', 'exercism.org', 'egghead.io', 'frontendmasters.com', 'codecademy.com', 'scrimba.com', 'pluralsight.com'],
    type: 'curso',
  },
  {
    hosts: ['npmjs.com', 'pypi.org', 'crates.io', 'marketplace.visualstudio.com', 'chromewebstore.google.com', 'addons.mozilla.org', 'producthunt.com', 'alternativeto.net'],
    type: 'herramienta',
  },
  {
    hosts: ['medium.com', 'dev.to', 'hashnode.dev', 'substack.com', 'css-tricks.com', 'smashingmagazine.com', 'developer.mozilla.org', 'stackoverflow.com', 'web.dev', 'hackernoon.com', 'freecodecamp.org'],
    type: 'articulo',
  },
]

function hostMatches(host: string, candidates: string[]): boolean {
  return candidates.some((c) => host === c || host.endsWith(`.${c}`))
}

/** Tipo por dominio; si el dominio no dice nada, usa `og:type`. */
export function detectType(url: string, ogType?: string): ResourceType {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return 'otro'
  }
  const host = parsed.hostname.replace(/^www\./, '')
  const segments = parsed.pathname.split('/').filter(Boolean)

  for (const rule of TYPE_RULES) {
    if (!hostMatches(host, rule.hosts)) continue
    if (rule.paths && !rule.paths.some((p) => parsed.pathname.startsWith(p))) continue
    if (rule.minSegments && segments.length < rule.minSegments) continue
    return rule.type
  }

  const og = ogType?.toLowerCase() ?? ''
  if (og.startsWith('video')) return 'video'
  if (og === 'article') return 'articulo'
  if (/(^|\.)(blog|docs)\./.test(host) || /^\/(blog|posts?|articles?)\//.test(parsed.pathname)) return 'articulo'
  return 'otro'
}

// Etiqueta canónica → términos que la disparan (en minúsculas).
const TAG_DICTIONARY: Record<string, string[]> = {
  javascript: ['javascript', 'ecmascript', 'es6', 'vanilla js'],
  typescript: ['typescript'],
  react: ['react', 'reactjs', 'react.js', 'jsx'],
  nextjs: ['next.js', 'nextjs'],
  vue: ['vue', 'vuejs', 'vue.js', 'nuxt'],
  angular: ['angular'],
  svelte: ['svelte', 'sveltekit'],
  astro: ['astro'],
  node: ['node.js', 'nodejs', 'npm'],
  deno: ['deno'],
  bun: ['bun.sh', 'bunjs'],
  express: ['express.js', 'expressjs'],
  nestjs: ['nestjs', 'nest.js'],
  python: ['python', 'pip', 'pandas', 'numpy', 'jupyter'],
  django: ['django'],
  fastapi: ['fastapi', 'flask'],
  java: ['java', 'jvm'],
  spring: ['spring boot', 'springboot'],
  kotlin: ['kotlin'],
  go: ['golang'],
  rust: ['rust', 'rustlang', 'cargo'],
  csharp: ['c#', 'csharp', '.net', 'dotnet', 'asp.net', 'blazor'],
  php: ['php', 'laravel', 'symfony'],
  ruby: ['ruby', 'rails'],
  swift: ['swift', 'swiftui'],
  flutter: ['flutter', 'dart'],
  mobile: ['android', 'ios', 'react native', 'react-native', 'expo'],
  html: ['html', 'html5'],
  css: ['css', 'css3', 'sass', 'scss', 'flexbox', 'grid layout'],
  tailwind: ['tailwind', 'tailwindcss'],
  sql: ['sql', 'postgres', 'postgresql', 'mysql', 'sqlite', 'prisma', 'drizzle'],
  nosql: ['mongodb', 'mongo', 'redis', 'firebase', 'dynamodb'],
  graphql: ['graphql', 'apollo'],
  api: ['api', 'rest api', 'openapi', 'swagger'],
  docker: ['docker', 'dockerfile', 'container', 'contenedores'],
  kubernetes: ['kubernetes', 'k8s', 'helm'],
  cloud: ['aws', 'azure', 'gcp', 'google cloud', 'vercel', 'netlify', 'cloudflare', 'serverless'],
  devops: ['devops', 'ci/cd', 'github actions', 'terraform', 'ansible'],
  linux: ['linux', 'bash', 'shell', 'terminal', 'ubuntu', 'zsh'],
  git: ['git', 'commit', 'branching', 'rebase'],
  testing: ['testing', 'test', 'tests', 'jest', 'vitest', 'cypress', 'playwright', 'tdd', 'pruebas'],
  ia: ['ia', 'ai', 'llm', 'gpt', 'chatgpt', 'openai', 'claude', 'machine learning', 'deep learning', 'inteligencia artificial', 'prompt', 'rag'],
  algoritmos: ['algorithm', 'algorithms', 'algoritmo', 'algoritmos', 'leetcode', 'data structures', 'estructuras de datos', 'big o'],
  seguridad: ['security', 'seguridad', 'owasp', 'oauth', 'jwt', 'hacking', 'ciberseguridad'],
  arquitectura: ['architecture', 'arquitectura', 'design patterns', 'patrones de diseño', 'microservices', 'microservicios', 'clean code', 'solid', 'ddd'],
  diseño: ['figma', 'ux', 'ui design', 'diseño web', 'design system'],
  rendimiento: ['performance', 'rendimiento', 'web vitals', 'optimización', 'optimization'],
  carrera: ['entrevista', 'interview', 'portfolio', 'portafolio', 'cv', 'freelance', 'carrera', 'career'],
}

const MAX_TAGS = 5

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Coincidencia por "palabra": el término no puede estar pegado a otras letras/números.
const TAG_MATCHERS: [string, RegExp][] = Object.entries(TAG_DICTIONARY).map(([tag, terms]) => [
  tag,
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'giu'),
])

/** Etiquetas sin IA: términos del diccionario presentes en el texto, ordenados por frecuencia. */
export function extractTags(...texts: (string | undefined)[]): string[] {
  const haystack = texts
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase()
  if (!haystack) return []

  const scored: [string, number][] = []
  for (const [tag, matcher] of TAG_MATCHERS) {
    const count = haystack.match(matcher)?.length ?? 0
    if (count > 0) scored.push([tag, count])
  }
  return scored
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TAGS)
    .map(([tag]) => tag)
}

/** Convierte la ruta de una URL en texto buscable ("/how-to-learn-react" → "how to learn react"). */
export function urlToText(url: string): string {
  try {
    const { pathname } = new URL(url)
    return decodeURIComponent(pathname).replace(/[/_\-+]+/g, ' ')
  } catch {
    return ''
  }
}

/** Metadatos deducidos solo de la URL: base al capturar y fallback si el scraper falla. */
export function fallbackMetadata(url: string): ScrapeResult {
  return {
    url,
    title: titleFromUrl(url),
    summary: '',
    siteName: getDomain(url),
    type: detectType(url),
    tags: extractTags(urlToText(url)),
    fallback: true,
  }
}
