import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * `base` has to match where the site is served from.
 *
 * GitHub Pages serves a project repo at /<repo>/, so asset URLs need that
 * prefix or every file 404s. The deploy workflow sets GITHUB_PAGES; local dev,
 * Vercel and Netlify all serve from the root and leave it unset.
 */
const base = process.env.GITHUB_PAGES ? '/portfolio/' : '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5173 },
  build: {
    // three + drei + postprocessing is legitimately a large single chunk for a
    // scene like this, and it is all needed before the first frame. Raise the
    // warning threshold rather than pretend a code-split would help.
    chunkSizeWarningLimit: 1400,
  },
})
