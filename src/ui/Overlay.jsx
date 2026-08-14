import { SECTIONS } from '../data/content'
import { useStore } from '../state/store'

/**
 * Screen-space chrome: section nav and the interaction hint.
 *
 * Deliberately no title card. The name and tagline sat over whatever the camera
 * happened to be showing — usually a tree — and no amount of text shadow makes
 * that reliably legible. The meadow itself is the first impression; the name
 * lives in the browser tab and in the Contact stone.
 *
 * No emoji and no garden metaphor in the labels either — the metaphor is the
 * space. Naming a nav item "Seedlings" makes a visitor decode a menu; naming it
 * "Projects" lets them look at the meadow instead.
 */
export default function Overlay() {
  const active = useStore((s) => s.active)
  const open = useStore((s) => s.open)
  const close = useStore((s) => s.close)

  const inGallery = active === 'gallery'
  const inLab = active === 'lab'
  const indoors = inGallery || inLab

  const toggle = (id) => (active === id ? close() : open(id))

  return (
    <div className="overlay">
      <nav className="nav">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            className={`nav__item ${active === section.id ? 'nav__item--active' : ''}`}
            onClick={() => toggle(section.id)}
          >
            {section.label}
          </button>
        ))}

        <button
          className={`nav__item nav__item--place ${inGallery ? 'nav__item--active' : ''}`}
          onClick={() => toggle('gallery')}
        >
          Studio
        </button>
        <button
          className={`nav__item nav__item--place nav__item--tight ${inLab ? 'nav__item--active' : ''}`}
          onClick={() => toggle('lab')}
        >
          Lab
        </button>
      </nav>

      {indoors ? (
        <button className="leave" onClick={close}>
          ← Back to the meadow
        </button>
      ) : (
        <p className="hint">
          Drag to look around · scroll to zoom · click a stone or a building
        </p>
      )}
    </div>
  )
}
