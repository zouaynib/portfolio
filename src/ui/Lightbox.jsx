import { useEffect, useState } from 'react'

import { ARTWORKS } from '../data/artwork'
import { asset } from '../data/asset'
import { useStore } from '../state/store'

/**
 * Full-size view of a single painting.
 *
 * Uses a plain <img> rather than the WebGL texture, so the browser serves the
 * image at full resolution and the picture is never limited by what the frame
 * in the 3D scene needed.
 */
export default function Lightbox() {
  const openedArt = useStore((s) => s.openedArt)
  const closeArt = useStore((s) => s.closeArt)
  const [missing, setMissing] = useState(false)

  const art = ARTWORKS.find((a) => a.id === openedArt)

  // Reset the missing flag when a different piece is opened, or the previous
  // failure would stick to an image that actually exists.
  useEffect(() => {
    setMissing(false)
  }, [openedArt])

  useEffect(() => {
    if (!art) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closeArt()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [art, closeArt])

  if (!art) return null

  return (
    <div className="lightbox" onClick={closeArt} role="dialog" aria-modal="true">
      <button className="lightbox__close" onClick={closeArt} aria-label="Close">
        ×
      </button>

      <figure
        className={`lightbox__figure ${missing ? 'lightbox__figure--empty' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {!missing && (
          <img
            className="lightbox__image"
            src={asset(art.src)}
            alt={art.title}
            // No file yet: fall back to an empty plate rather than the
            // browser's broken-image glyph.
            onError={() => setMissing(true)}
          />
        )}

        <figcaption className="lightbox__caption">
          <span className="lightbox__title">{art.title}</span>
          {art.meta && <span className="lightbox__meta">{art.meta}</span>}
          {art.description && <p className="lightbox__description">{art.description}</p>}
          {/* Only useful while the file is still missing. */}
          {missing && <span className="lightbox__hint">add {art.src}</span>}
        </figcaption>
      </figure>
    </div>
  )
}
