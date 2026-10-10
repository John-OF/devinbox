import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

// Genera los iconos PNG de la PWA a partir del SVG: `npm run icons`
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { background: '#4f46e5' } },
    apple: { ...preset.apple, resizeOptions: { background: '#4f46e5' } },
  },
  images: ['public/favicon.svg'],
})
