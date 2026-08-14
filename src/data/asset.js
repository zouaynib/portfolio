/**
 * Resolve a path in `public/` against wherever the site is deployed.
 *
 * Vite rewrites imported assets but not plain string paths, so `/artwork/x.jpg`
 * written in a data file would resolve against the domain root — which 404s on
 * GitHub Pages, where the site lives under /portfolio/. `BASE_URL` is '/' in dev
 * and on root deploys, and the repo path on Pages.
 */
export const asset = (path) => {
  if (!path) return path
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
