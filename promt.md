Actúa como un Tech Lead Fullstack Senior. Vamos a inicializar y construir desde cero "DevInbox", una Progressive Web App (PWA) minimalista y de alta velocidad diseñada para gestionar y depurar links y recursos de programación acumulados (bandeja de entrada con ciclo de vida / triage rápido).

### 0. Problema a resolver
Tengo mi chat de WhatsApp lleno de links de recursos de programación (webs, videos de YouTube, cursos, repos, etc.) mezclados con otras cosas. Como son muchos, olvido qué era cada uno y quedan enterrados por lo nuevo. Acabo acumulando recursos que nunca uso.

DevInbox debe permitirme:
- **Recopilar:** importar de una vez todos los links acumulados en WhatsApp y capturar los nuevos sin fricción.
- **Clasificar:** detectar automáticamente tipo y etiquetas de cada recurso.
- **Filtrar y buscar:** encontrar rápido lo que me interesa.
- **Depurar:** decidir en segundos qué estudio, qué archivo y qué borro, viendo cuánto tiempo lleva olvidado cada link.

### 1. Stack Técnico
- **Frontend:** React 18+ con TypeScript, Vite y Tailwind CSS. Iconos con `lucide-react`.
- **Backend / Scraper:** Servidor local ligero en Node.js (Express o Fastify) con TypeScript, o endpoints de servidor integrados, usando `cheerio` y `axios` para raspar metadatos OpenGraph (`og:title`, `og:description`, `og:image`) y soporte para oEmbed de YouTube.
- **Persistencia:** Capa desacoplada con adaptador. Implementa inicialmente persistencia local reactiva (IndexedDB con Dexie.js o LocalStorage) con una interfaz limpia (`StorageAdapter`) que permita sincronizar después con Postgres en **Neon** a través de una API propia.
- **Despliegue:** Vercel (frontend estático + funciones serverless) con Neon Postgres (ver sección 5).

### 2. Modelo de Datos (`Resource`)
```typescript
export interface Resource {
  id: string;
  url: string;
  title: string;
  summary: string;
  imageUrl?: string;
  type: 'video' | 'articulo' | 'repo' | 'curso' | 'herramienta' | 'otro';
  tags: string[];
  status: 'inbox' | 'reading' | 'archived'; // UI: Inbox / En Estudio / Archivo
  createdAt: string; // ISO
  updatedAt: string; // ISO — resuelve conflictos al sincronizar (gana el más reciente)
  lastVisitedAt?: string;
  deletedAt?: string; // ISO — borrado lógico, para propagar eliminaciones entre dispositivos
  enrichStatus?: 'pending' | 'failed'; // estado del scraper; ausente = completado
}
```

### 3. Requerimientos Funcionales y UI/UX

#### Flujo de Triage Rápido (Inbox Zero)
- Vista principal en pestañas o filtros: **Inbox** (por defecto), **En Estudio**, **Archivo**.
- Cada tarjeta debe mostrar: miniatura, título, dominio, etiquetas automáticas, tiempo transcurrido (ej. "Añadido hace 18 días") y acciones rápidas:
  - **Abrir** (registra `lastVisitedAt` y abre en nueva pestaña).
  - **Mover a Estudio** (tecla rápida o clic).
  - **Archivar** (tecla rápida o clic).
  - **Eliminar / Descartar** (un solo clic, con toast que permita deshacer).
- Atajos de teclado en la vista Inbox cuando una tarjeta está seleccionada:
  - `J` / `K`: navegar
  - `D`: eliminar
  - `A`: archivar
  - `S`: pasar a estudio
  - `Enter`: abrir

#### Captura sin Fricción
Input flotante o superior donde solo se pega una URL y, al presionar Enter:
1. Muestra estado de carga (skeleton loader).
2. Consulta al backend/scraper para obtener título, imagen, descripción y detectar tipo (`youtube.com` → video, `github.com` → repo, etc.).
3. Guarda en `inbox` inmediatamente.

#### Herramienta de Importación de WhatsApp
- Un modal o sección de utilidades con un botón o drag-and-drop para subir el archivo `_chat.txt` exportado de WhatsApp.
- El sistema debe parsear el texto mediante regex, extraer todas las URLs únicas descartando duplicados, y permitir una importación por lotes en segundo plano con barra de progreso.

#### Soporte PWA (Web Share Target)
Configura `vite-plugin-pwa` con un `manifest.webmanifest` que incluya la configuración `share_target`, para que la app pueda recibir URLs compartidas nativamente desde navegadores móviles o WhatsApp.

### 4. Plan de Ejecución
Ejecuta la implementación en las siguientes fases autónomamente, comprobando que cada paso compile y funcione:

- **Fase 1 - Scaffolding:** Configura el proyecto con Vite, TypeScript, Tailwind CSS, Lucide Icons y la estructura de carpetas (`src/components`, `src/services`, `src/types`, `src/hooks`).
- **Fase 2 - Scraper API:** Implementa el servidor Node.js/Express para `/api/scrape` que resuelva metadatos de cualquier URL con timeouts seguros y fallback cuando un sitio bloquee el scraping. Configura el proxy en `vite.config.ts`.
- **Fase 3 - Core & UI:** Desarrolla el cliente de almacenamiento, la vista de Inbox con tarjetas interactivas, filtros por estado/tipo, barra de búsqueda y atajos de teclado.
- **Fase 4 - Parser de WhatsApp:** Crea el componente y la lógica de extracción para importar el `.txt` de WhatsApp.
- **Fase 5 - PWA & Testing:** Configura el Service Worker básico, el manifest con `share_target` y valida que todo compile con `npm run build` sin errores de TypeScript ni linter.
> **Estado (2026-10-10):** Fases 1 a 5 completadas y verificadas en el navegador. `npm run build`, `npm run lint` y `npm test` (40 tests) pasan sin errores.

- **Fase 6 - Deploy & Sincronización:** login con contraseña y sesión por cookie, Neon + Drizzle, endpoints de sincronización, `SyncService` en el cliente y despliegue en Vercel (ver sección 5, "Despliegue y sincronización" y "Seguridad"). **Requiere confirmación antes de ejecutarse:** crea recursos en las cuentas de Vercel y Neon.

### 5. Decisiones Técnicas (resuelven las ambigüedades de las secciones anteriores)

#### Stack completo
- **Frontend:**
  - React 19 (cumple "18+"), TypeScript, Vite, Tailwind CSS v4 y `lucide-react`.
  - Dexie.js para el almacenamiento local, `vite-plugin-pwa` (Workbox) para Service Worker y manifest, y `sonner` para los toasts con "Deshacer".
  - Sin router ni librería de estado global: las pestañas son estado local, los datos llegan vía `StorageAdapter.observe` y la ruta `/share` se resuelve leyendo `location` al arrancar.
- **Backend:**
  - Node.js 24 LTS, Express 5 y TypeScript.
  - `axios` + `cheerio` para el scraping y `zod` para validar entradas.
  - `tsx` para ejecutar el servidor en desarrollo.
- **Base de datos (Fase 6):** Neon Postgres, Drizzle ORM + `drizzle-kit` (esquema tipado y migraciones) y el driver `@neondatabase/serverless`.
- **Calidad:**
  - oxlint (el linter que trae la plantilla actual de Vite; incluye las reglas de hooks de React).
  - Vitest para la lógica pura: parser de WhatsApp, normalización de URLs y detección de tipo/etiquetas.
- **Gestor de paquetes:** npm.
  - `npm run dev` levanta web y servidor a la vez con `concurrently`.
  - Además: `npm run build`, `npm run lint`, `npm test` y `npm run icons` (regenera los PNG de la PWA desde `public/favicon.svg`).

#### Estructura
- `src/`: la web, con `components/`, `services/`, `types/` y `hooks/`.
- `src/services/`: lógica sin UI. `storage/` (adapter + Dexie), `enrichment.ts` (cola del scraper), `resources.ts` (acciones), `whatsapp.ts` (parser), y `url.ts` / `classify.ts`, compartidos con el servidor.
- `server/`: la app de Express. `app.ts` define rutas sin `listen`; `dev.ts` hace `listen` para desarrollo local; `scrape/` contiene la extracción de metadatos.
- `api/index.ts`: entrada de Vercel, que reexporta la misma app de Express.

#### Persistencia
- **Dexie.js (IndexedDB)**, no LocalStorage: permite consultas por índice (`status`, `type`, `createdAt`, `tags` multiEntry) y no bloquea el hilo principal.
- La reactividad vive **dentro** del `StorageAdapter` (`observe(query, cb) → unsubscribe`), implementada con `liveQuery` de Dexie.
- Los componentes y hooks nunca importan Dexie directamente; solo usan el adapter.
- Eliminar marca `deletedAt` (borrado lógico) y las consultas excluyen los borrados. Así la Fase 6 puede propagar eliminaciones sin cambiar el modelo.

#### Scraper (`GET /api/scrape?url=`)
- La extracción vive en una función pura (`extractMetadata(url)`), independiente de Express y fácil de testear.
- La misma app de Express corre en local (`server/dev.ts` + proxy de Vite) y en Vercel (`api/index.ts`).
- Para YouTube usa oEmbed; para el resto, OpenGraph con fallback a `<title>` y `<meta name="description">`.
- Seguridad y robustez: timeout de ~8 s, límite de tamaño de respuesta, User-Agent de navegador, solo `http`/`https` y bloqueo de IPs privadas/locales.
- **Fallback:** si el sitio bloquea o falla, responde con título derivado del dominio/ruta y tipo inferido por URL.

#### Guardado y enriquecimiento
- Guardar nunca depende del scraper: el recurso se guarda en `inbox` al instante con datos mínimos (dominio, tipo inferido) y se actualiza cuando llega la respuesta del scraper. Así no se pierde ningún link aunque el scraper falle o se cierre la pestaña.
- Si el enriquecimiento falla, la tarjeta ofrece "reintentar".

#### Clasificación automática
- **Tipo** por dominio (y por `og:type` cuando aplique):
  - video: youtube.com, youtu.be, vimeo.com
  - repo: github.com, gitlab.com
  - curso: udemy.com, coursera.org, platzi.com, edx.org
  - herramienta: npmjs.com, marketplace.visualstudio.com
  - articulo: medium.com, dev.to, o `og:type=article`
  - otro: el resto
- **Etiquetas** sin IA: diccionario de términos técnicos (react, typescript, python, docker, css, etc.) buscados en título, descripción y ruta de la URL; máximo ~5 por recurso.

#### Normalización y duplicados
- Normalizar URLs antes de guardar: host en minúsculas, quitar `utm_*`, `fbclid` y `si`, quitar la barra final, y convertir `youtu.be/ID` en `youtube.com/watch?v=ID`.
- Índice único sobre la URL normalizada. Si se captura un duplicado: toast "ya existe" y se selecciona la tarjeta existente.

#### Importación de WhatsApp
- Soportar formatos de Android (`10/10/26, 13:56 - Nombre: msg`, también con `p. m.`) e iOS (`[10/10/26, 13:56:02] Nombre: msg`, con posible `U+200E` inicial). Las líneas sin fecha pertenecen al mensaje anterior.
- Fechas en `dd/mm` por defecto (locale es); si algún mensaje tiene el segundo campo > 12, el archivo es `mm/dd`.
- Regex `https?://[^\s<>"]+`, quitando puntuación final (`.,;:!?)`).
- **`createdAt` = fecha del mensaje original**, para que "Añadido hace X días" refleje la antigüedad real del link.
- Deduplicar dentro del archivo **y** contra lo que ya está en la base. Antes de importar, mostrar un resumen: N nuevos y M duplicados.
- Importación: guardar todos al instante con datos mínimos y enriquecer en segundo plano con una concurrencia máxima de 4. La barra de progreso refleja el enriquecimiento.

#### Share Target
- `share_target` por GET a `/share?title=&text=&url=`. WhatsApp suele mandar el link dentro de `text`, no de `url`, así que se extrae con la misma regex del importador.

#### UI
- Tiempo relativo con `Intl.RelativeTimeFormat('es')`, sin librerías de fechas.
- Los atajos de teclado se ignoran cuando el foco está en un input.

#### Despliegue y sincronización (Fase 6)
- **Hosting en Vercel (plan Hobby, gratis):**
  - Frontend estático (build de Vite).
  - `api/index.ts` como función serverless que reexporta la app de Express, con un rewrite `/api/(.*)` → `/api` en `vercel.json`.
  - HTTPS incluido, que es requisito de PWA y de Share Target.
- **Base de datos:** Neon instalado desde el Marketplace de Vercel, que inyecta `DATABASE_URL` automáticamente. Las migraciones se hacen con `drizzle-kit`.
- **API de sincronización:**
  - `GET /api/resources?since=<ISO>`: cambios desde la última sincronización, borrados incluidos.
  - `PUT /api/resources`: upsert por lotes de los cambios locales.
- **Acceso:** login con contraseña y sesión por cookie `HttpOnly` (ver "Seguridad").
- **Sincronización local-first:**
  - La UI sigue hablando solo con Dexie: toda escritura va primero a Dexie y queda marcada como pendiente.
  - Un `SyncService` envía los pendientes y trae los cambios (`since`) en estos momentos: al abrir la app, al recuperar foco o conexión, y tras cada escritura (con debounce).
  - Conflictos: gana el `updatedAt` más reciente.

#### Seguridad (Fase 6)
Principio: la web (HTML/JS) puede ser pública porque no contiene datos. **Todo dato pasa por la API y la API exige sesión.** La seguridad no depende de que el link sea secreto.

- **Login de un solo usuario con contraseña:**
  - En el servidor solo vive el hash (scrypt) en la variable de entorno `DEVINBOX_PASSWORD_HASH`. La contraseña solo viaja en el login, por HTTPS.
  - Comparación en tiempo constante (`crypto.timingSafeEqual`) y mensaje de error genérico.
  - `npm run hash-password` genera el hash en local.
- **Sesión en cookie, no en localStorage:**
  - `POST /api/login` responde con la cookie `devinbox_session`: `HttpOnly; Secure; SameSite=Strict; Path=/api`, firmada con HMAC usando `SESSION_SECRET` y con expiración de 180 días.
  - El JavaScript de la página no puede leerla, así que un script inyectado no puede robar la sesión.
  - `POST /api/logout` la borra. Cambiar `SESSION_SECRET` en Vercel invalida todas las sesiones (por ejemplo, si pierdes el móvil).
  - Share Target sigue funcionando: las llamadas a `/api` salen de la propia app, así que la cookie viaja.
- **Toda la API exige sesión**, incluido `/api/scrape`, para que nadie use el scraper como proxy. Sin sesión responde `401`. Solo quedan abiertos `POST /api/login` y `GET /api/health`.
- **Límite de intentos de login:** 5 fallos → bloqueo de 15 minutos. El contador vive en una tabla de Neon (`login_attempts`), porque en serverless la memoria no persiste entre invocaciones.
- **Protección de los datos ante una sesión robada:**
  - La API nunca borra filas: eliminar = `deletedAt`.
  - Un trigger de Postgres copia la versión anterior de cada fila a `resources_history` en cada `UPDATE`. Ni sobrescribir campos destruye información.
  - La restauración de Neon queda como última red.
- **Cabeceras** (en `vercel.json`):
  - `Content-Security-Policy`: `default-src 'self'`; `img-src 'self' https: data:` (miniaturas de cualquier sitio); `style-src 'self' 'unsafe-inline'` (los toasts inyectan estilos); `connect-src 'self'`; `frame-ancestors 'none'`.
  - `Referrer-Policy: no-referrer` y `X-Content-Type-Options: nosniff`.
- **Orden obligatorio:** la API de recursos no se conecta a la base de datos hasta que el login funcione y se verifique que cualquier petición sin sesión devuelve `401`.
- **Desarrollo local:** el servidor escucha solo en `127.0.0.1`, no en la red Wi-Fi.

### 6. Limitaciones conocidas
- **Antes de la Fase 6 no hay datos en ningún servidor:** cada navegador solo ve su propio IndexedDB. Quien abra el link ve una app vacía, no tus recursos.
- **Hasta la Fase 6, los datos son por dispositivo:** IndexedDB vive en cada navegador, así que lo compartido desde el móvil y lo importado en el PC no se juntan hasta que exista la sincronización.
- **Share Target solo funciona en Android** (Chrome/Edge con la PWA instalada); iOS no lo soporta.
- **Scraping desde Vercel:** algunos sitios bloquean IPs de datacenter más que una IP doméstica. El fallback del scraper cubre esos casos (el link se guarda igual, con menos metadatos).
