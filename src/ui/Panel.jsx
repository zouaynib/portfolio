import { SECTIONS } from '../data/content'
import { useStore } from '../state/store'

/**
 * Content panel.
 *
 * Deliberately plain typography over a soft translucent card: the 3D scene is
 * doing the visual work, and competing with it here would make both look busy.
 */
export default function Panel() {
  const active = useStore((s) => s.active)
  const close = useStore((s) => s.close)

  // 'gallery' is an active state with no panel — the studio's content is the
  // room itself.
  const section = SECTIONS.find((s) => s.id === active)

  return (
    <div className={`panel ${section ? 'panel--open' : ''}`} aria-hidden={!section}>
      {section && (
        <>
          <button className="panel__close" onClick={close} aria-label="Close">
            ×
          </button>

          <h2 className="panel__heading">{section.heading}</h2>

          {section.body.map((paragraph) => (
            <p key={paragraph} className="panel__body">
              {paragraph}
            </p>
          ))}

          {section.items.length > 0 && (
            <ul className="panel__list">
              {section.items.map((item, index) => (
                // Index key: placeholder items can share a title, and the list
                // is static for a given section anyway.
                <li key={`${item.title}-${index}`} className="panel__item">
                  <h3 className="panel__item-title">
                    {item.link ? (
                      <a href={item.link} target="_blank" rel="noreferrer">
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </h3>
                  {item.meta && <span className="panel__item-meta">{item.meta}</span>}
                  <p className="panel__item-text">{item.text}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
