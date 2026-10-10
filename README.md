# DevInbox

Bandeja de entrada para los links de programación que se acumulan en WhatsApp: los recopila, los clasifica y te ayuda a decidir rápido qué estudiar, qué archivar y qué borrar.

La especificación completa y las decisiones técnicas están en [`promt.md`](./promt.md).

## Uso local

Requiere Node 24+.

```bash
npm install
npm run dev        # web en http://localhost:5173 + scraper en http://localhost:3001
```

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Vite + API de scraping (Express) a la vez |
| `npm run build` | Type-check de web y servidor + build de producción con Service Worker |
| `npm run preview` | Sirve el build (necesita la API corriendo para el scraping) |
| `npm run lint` | oxlint |
| `npm test` | Vitest (parser de WhatsApp, URLs, clasificación) |
| `npm run icons` | Regenera los iconos PNG de la PWA desde `public/favicon.svg` |

## Atajos de teclado

`J`/`K` navegar · `Enter` abrir · `S` pasar a estudio · `A` archivar · `D` eliminar (con deshacer) · `Esc` quitar selección

## Importar un chat de WhatsApp

En el chat: menú **⋮ → Más → Exportar chat → Sin archivos**. Sube el `.txt` desde el botón **Importar** (si llega como `.zip`, descomprímelo antes).
